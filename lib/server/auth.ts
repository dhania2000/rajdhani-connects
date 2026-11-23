import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { execute, isDbConfigured, queryOne, withTransaction } from './db'
import { writeAudit } from './audit'
import { burnPasswordCheck, generateToken, hashPassword, sha256, verifyPassword } from './passwords'

export type AccountType = 'admin' | 'contractor'

export const SESSION_COOKIE: Record<AccountType, string> = {
  admin: 'rts_admin_session',
  contractor: 'rts_contractor_session',
}

const SESSION_HOURS: Record<AccountType, number> = { admin: 12, contractor: 24 * 30 }
const MAX_FAILED_ATTEMPTS = 5
const LOCK_MINUTES = 15
const IP_WINDOW_MINUTES = 15
const IP_MAX_FAILURES = 25

export interface AdminSession {
  sessionId: number
  adminId: number
  name: string
  email: string
  role: 'super_admin' | 'admin'
}

export interface ContractorSession {
  sessionId: number
  contractorId: number
  name: string
  username: string
  mustChangePassword: boolean
}

export async function requestMeta() {
  const h = await headers()
  const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? '').trim().slice(0, 45) || null
  const userAgent = h.get('user-agent')?.slice(0, 255) ?? null
  return { ip, userAgent }
}

async function setSessionCookie(type: AccountType, token: string) {
  const store = await cookies()
  store.set(SESSION_COOKIE[type], token, {
    httpOnly: true,
    secure: true,
    // Development previews may run inside an iframe, which needs SameSite=None.
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
    path: '/',
    maxAge: SESSION_HOURS[type] * 3600,
  })
}

async function createSession(type: AccountType, accountId: number) {
  const token = generateToken()
  const { ip, userAgent } = await requestMeta()
  await execute(
    `INSERT INTO sessions (token_hash, account_type, admin_id, contractor_id, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR))`,
    [
      sha256(token),
      type,
      type === 'admin' ? accountId : null,
      type === 'contractor' ? accountId : null,
      ip,
      userAgent,
      SESSION_HOURS[type],
    ],
  )
  await setSessionCookie(type, token)
}

export async function destroySession(type: AccountType) {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE[type])?.value
  if (token && isDbConfigured()) {
    await execute('UPDATE sessions SET revoked_at = UTC_TIMESTAMP() WHERE token_hash = ? AND revoked_at IS NULL', [
      sha256(token),
    ])
  }
  store.delete(SESSION_COOKIE[type])
}

export async function revokeAllSessions(type: AccountType, accountId: number, exceptSessionId?: number) {
  const column = type === 'admin' ? 'admin_id' : 'contractor_id'
  await execute(
    `UPDATE sessions SET revoked_at = UTC_TIMESTAMP()
     WHERE ${column} = ? AND revoked_at IS NULL ${exceptSessionId ? 'AND id <> ?' : ''}`,
    exceptSessionId ? [accountId, exceptSessionId] : [accountId],
  )
}

async function readSessionToken(type: AccountType) {
  if (!isDbConfigured()) return null
  const store = await cookies()
  const token = store.get(SESSION_COOKIE[type])?.value
  return token ? sha256(token) : null
}

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const tokenHash = await readSessionToken('admin')
  if (!tokenHash) return null
  const row = await queryOne<{ sid: number; id: number; name: string; email: string; role: AdminSession['role'] }>(
    `SELECT s.id AS sid, a.id, a.name, a.email, a.role
     FROM sessions s JOIN admins a ON a.id = s.admin_id
     WHERE s.token_hash = ? AND s.account_type = 'admin' AND s.revoked_at IS NULL
       AND s.expires_at > UTC_TIMESTAMP() AND a.status = 'active'`,
    [tokenHash],
  )
  return row ? { sessionId: row.sid, adminId: row.id, name: row.name, email: row.email, role: row.role } : null
})

export const getContractorSession = cache(async (): Promise<ContractorSession | null> => {
  const tokenHash = await readSessionToken('contractor')
  if (!tokenHash) return null
  const row = await queryOne<{ sid: number; id: number; name: string; username: string; must_change_password: number }>(
    `SELECT s.id AS sid, c.id, c.name, cc.username, cc.must_change_password
     FROM sessions s
     JOIN contractors c ON c.id = s.contractor_id
     JOIN contractor_credentials cc ON cc.contractor_id = c.id
     WHERE s.token_hash = ? AND s.account_type = 'contractor' AND s.revoked_at IS NULL
       AND s.expires_at > UTC_TIMESTAMP() AND c.account_status = 'active'`,
    [tokenHash],
  )
  return row
    ? {
        sessionId: row.sid,
        contractorId: row.id,
        name: row.name,
        username: row.username,
        mustChangePassword: Boolean(row.must_change_password),
      }
    : null
})

export async function requireAdmin(options: { superAdmin?: boolean } = {}) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  if (options.superAdmin && session.role !== 'super_admin') redirect('/admin')
  return session
}

export async function requireContractor(options: { allowPasswordChange?: boolean } = {}) {
  const session = await getContractorSession()
  if (!session) redirect('/contractor/login')
  if (session.mustChangePassword && !options.allowPasswordChange) redirect('/contractor/change-password')
  return session
}

async function recordAttempt(
  type: AccountType,
  identifier: string,
  accountId: number | null,
  success: boolean,
  reason: string | null,
) {
  const { ip, userAgent } = await requestMeta()
  await execute(
    `INSERT INTO login_attempts (account_type, identifier, admin_id, contractor_id, ip_address, user_agent, success, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      type,
      identifier.slice(0, 190),
      type === 'admin' ? accountId : null,
      type === 'contractor' ? accountId : null,
      ip,
      userAgent,
      success ? 1 : 0,
      reason,
    ],
  )
}

async function ipIsThrottled() {
  const { ip } = await requestMeta()
  if (!ip) return false
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM login_attempts
     WHERE ip_address = ? AND success = 0 AND created_at > DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? MINUTE)`,
    [ip, IP_WINDOW_MINUTES],
  )
  return (row?.n ?? 0) >= IP_MAX_FAILURES
}

export type LoginResult = { ok: true; mustChangePassword?: boolean } | { ok: false; error: string }

const GENERIC_ERROR = 'Invalid credentials. Please check and try again.'
const THROTTLED_ERROR = 'Too many attempts. Please wait a few minutes and try again.'

const MIN_BOOTSTRAP_PASSWORD = 8

// When the admins table is empty, the first credentials submitted become the super admin.
async function bootstrapSuperAdmin(identifier: string, password: string): Promise<LoginResult | null> {
  const existing = await queryOne<{ n: number }>('SELECT COUNT(*) AS n FROM admins')
  if ((existing?.n ?? 0) > 0) return null

  if (identifier.length < 3) {
    return { ok: false, error: 'First-time setup: enter an email or username of at least 3 characters.' }
  }
  if (password.length < MIN_BOOTSTRAP_PASSWORD) {
    return {
      ok: false,
      error: `First-time setup: choose a password of at least ${MIN_BOOTSTRAP_PASSWORD} characters for the super admin.`,
    }
  }

  const username = identifier.includes('@') ? null : identifier.slice(0, 60)
  const hash = await hashPassword(password)
  // NOT EXISTS guard keeps two simultaneous first logins from both creating a super admin.
  const result = await execute(
    `INSERT INTO admins (name, email, username, password_hash, role, status)
     SELECT 'Super Admin', ?, ?, ?, 'super_admin', 'active' FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM (SELECT id FROM admins LIMIT 1) AS existing_admin)`,
    [identifier.slice(0, 190), username, hash],
  )
  if (!result.affectedRows) return null

  await writeAudit({
    actorType: 'system',
    actorId: null,
    action: 'admin.bootstrap',
    entityType: 'admin',
    entityId: result.insertId,
    summary: `Super admin ${identifier} created on first login`,
  })
  return null
}

export async function loginAdmin(rawEmail: string, password: string): Promise<LoginResult> {
  const email = rawEmail.trim().toLowerCase()
  if (await ipIsThrottled()) return { ok: false, error: THROTTLED_ERROR }

  const bootstrapError = await bootstrapSuperAdmin(email, password)
  if (bootstrapError) return bootstrapError

  const admin = await queryOne<{
    id: number
    password_hash: string
    status: string
    failed_attempts: number
    locked: number
  }>(
    `SELECT id, password_hash, status, failed_attempts,
            (locked_until IS NOT NULL AND locked_until > UTC_TIMESTAMP()) AS locked
     FROM admins WHERE email = ? OR username = ? LIMIT 1`,
    [email, email],
  )

  if (!admin) {
    await burnPasswordCheck(password)
    await recordAttempt('admin', email, null, false, 'unknown_account')
    return { ok: false, error: GENERIC_ERROR }
  }
  if (admin.locked) {
    await recordAttempt('admin', email, admin.id, false, 'locked')
    return { ok: false, error: `Account temporarily locked. Try again in ${LOCK_MINUTES} minutes.` }
  }

  const valid = await verifyPassword(password, admin.password_hash)
  if (!valid) {
    const attempts = admin.failed_attempts + 1
    await execute(
      `UPDATE admins SET failed_attempts = ?, locked_until = IF(? >= ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), locked_until) WHERE id = ?`,
      [attempts, attempts, MAX_FAILED_ATTEMPTS, LOCK_MINUTES, admin.id],
    )
    await recordAttempt('admin', email, admin.id, false, 'bad_password')
    return { ok: false, error: GENERIC_ERROR }
  }
  if (admin.status !== 'active') {
    await recordAttempt('admin', email, admin.id, false, 'disabled')
    return { ok: false, error: 'This admin account is disabled.' }
  }

  await execute(
    'UPDATE admins SET failed_attempts = 0, locked_until = NULL, last_login_at = UTC_TIMESTAMP() WHERE id = ?',
    [admin.id],
  )
  await recordAttempt('admin', email, admin.id, true, null)
  await createSession('admin', admin.id)
  return { ok: true }
}

export async function loginContractor(rawIdentifier: string, password: string): Promise<LoginResult> {
  const identifier = rawIdentifier.trim().toLowerCase()
  if (await ipIsThrottled()) return { ok: false, error: THROTTLED_ERROR }

  const row = await queryOne<{
    contractor_id: number
    password_hash: string
    failed_attempts: number
    must_change_password: number
    account_status: string
    locked: number
  }>(
    `SELECT cc.contractor_id, cc.password_hash, cc.failed_attempts, cc.must_change_password, c.account_status,
            (cc.locked_until IS NOT NULL AND cc.locked_until > UTC_TIMESTAMP()) AS locked
     FROM contractor_credentials cc JOIN contractors c ON c.id = cc.contractor_id
     WHERE cc.username = ? OR c.mobile = ? LIMIT 1`,
    [identifier, identifier],
  )

  if (!row) {
    await burnPasswordCheck(password)
    await recordAttempt('contractor', identifier, null, false, 'unknown_account')
    return { ok: false, error: GENERIC_ERROR }
  }
  if (row.locked) {
    await recordAttempt('contractor', identifier, row.contractor_id, false, 'locked')
    return { ok: false, error: `Too many wrong attempts. Try again in ${LOCK_MINUTES} minutes or contact the store.` }
  }

  const valid = await verifyPassword(password, row.password_hash)
  if (!valid) {
    const attempts = row.failed_attempts + 1
    await execute(
      `UPDATE contractor_credentials SET failed_attempts = ?,
         locked_until = IF(? >= ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE), locked_until)
       WHERE contractor_id = ?`,
      [attempts, attempts, MAX_FAILED_ATTEMPTS, LOCK_MINUTES, row.contractor_id],
    )
    await recordAttempt('contractor', identifier, row.contractor_id, false, 'bad_password')
    return { ok: false, error: GENERIC_ERROR }
  }

  if (row.account_status !== 'active') {
    await recordAttempt('contractor', identifier, row.contractor_id, false, `status_${row.account_status}`)
    const message: Record<string, string> = {
      pending_approval: 'Your account is awaiting approval from Rajdhani Connects.',
      suspended: 'Your account is suspended. Please contact the store.',
      inactive: 'Your account is inactive. Please contact the store.',
      archived: 'Your account has been archived. Please contact the store.',
    }
    return { ok: false, error: message[row.account_status] ?? GENERIC_ERROR }
  }

  await execute(
    `UPDATE contractor_credentials SET failed_attempts = 0, locked_until = NULL, last_login_at = UTC_TIMESTAMP()
     WHERE contractor_id = ?`,
    [row.contractor_id],
  )
  await recordAttempt('contractor', identifier, row.contractor_id, true, null)
  await createSession('contractor', row.contractor_id)
  return { ok: true, mustChangePassword: Boolean(row.must_change_password) }
}

export async function changeContractorPassword(session: ContractorSession, current: string, next: string) {
  const row = await queryOne<{ password_hash: string }>(
    'SELECT password_hash FROM contractor_credentials WHERE contractor_id = ?',
    [session.contractorId],
  )
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    return { ok: false as const, error: 'Current password is incorrect.' }
  }
  if (await verifyPassword(next, row.password_hash)) {
    return { ok: false as const, error: 'New password must be different from the current one.' }
  }
  const hash = await hashPassword(next)
  await withTransaction(async (conn) => {
    await execute(
      `UPDATE contractor_credentials SET password_hash = ?, must_change_password = 0, password_changed_at = UTC_TIMESTAMP()
       WHERE contractor_id = ?`,
      [hash, session.contractorId],
      conn,
    )
    await execute(
      `UPDATE sessions SET revoked_at = UTC_TIMESTAMP() WHERE contractor_id = ? AND id <> ? AND revoked_at IS NULL`,
      [session.contractorId, session.sessionId],
      conn,
    )
    await writeAudit(
      {
        actorType: 'contractor',
        actorId: session.contractorId,
        action: 'contractor.password_changed',
        entityType: 'contractor',
        entityId: session.contractorId,
      },
      conn,
    )
  })
  return { ok: true as const }
}
