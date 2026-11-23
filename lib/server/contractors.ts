import { z } from 'zod'
import { execute, isDuplicateKeyError, padCode, query, queryOne, withTransaction } from './db'
import { writeAudit } from './audit'
import { generateTemporaryPassword, hashPassword } from './passwords'
import { revokeAllSessions, type AdminSession } from './auth'
import { postLedgerEntry, InsufficientBalanceError } from './ledger'

export type AccountStatus = 'pending_approval' | 'active' | 'suspended' | 'inactive' | 'archived'
export type VerificationStatus = 'pending' | 'verified' | 'rejected'

const mobile = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.')
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null))

export const contractorDetailsSchema = z.object({
  name: z.string().trim().min(2, 'Name is required.').max(120),
  mobile,
  alternateMobile: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[6-9]\d{9}$/.test(v), 'Enter a valid alternate mobile number.'),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || z.email().safeParse(v).success, 'Enter a valid email address.'),
  address: optionalText(255),
  area: optionalText(120),
  city: optionalText(80),
  district: optionalText(80),
  state: optionalText(80),
  pinCode: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\d{6}$/.test(v), 'PIN code must be 6 digits.'),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a joining date.'),
  notes: optionalText(2000),
})

export const createContractorSchema = contractorDetailsSchema.extend({
  activateNow: z.boolean(),
})

export type ContractorDetailsInput = z.infer<typeof contractorDetailsSchema>
export type CreateContractorInput = z.infer<typeof createContractorSchema>

export interface IssuedCredentials {
  contractorId: number
  contractorCode: string
  name: string
  mobile: string
  username: string
  temporaryPassword: string
}

// Store policy: the registered mobile number is both the username and the first password.
// The contractor is forced to choose a new password on first login.
export async function createContractor(
  admin: AdminSession,
  input: CreateContractorInput,
): Promise<{ ok: true; credentials: IssuedCredentials } | { ok: false; error: string; field?: string }> {
  const username = input.mobile
  const temporaryPassword = input.mobile
  const passwordHash = await hashPassword(temporaryPassword)

  try {
    return await withTransaction(async (conn) => {
      const status: AccountStatus = input.activateNow ? 'active' : 'pending_approval'
      const result = await execute(
        `INSERT INTO contractors
           (name, mobile, alternate_mobile, email, address, area, city, district, state, pin_code, joining_date, notes,
            verification_status, account_status, approved_at, approved_by_admin_id, created_by_admin_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.name,
          input.mobile,
          input.alternateMobile,
          input.email,
          input.address,
          input.area,
          input.city,
          input.district,
          input.state,
          input.pinCode,
          input.joiningDate,
          input.notes,
          input.activateNow ? 'verified' : 'pending',
          status,
          input.activateNow ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
          input.activateNow ? admin.adminId : null,
          admin.adminId,
        ],
        conn,
      )
      const contractorId = result.insertId
      const contractorCode = padCode('RTS-C-', contractorId, 5)
      await execute('UPDATE contractors SET contractor_code = ? WHERE id = ?', [contractorCode, contractorId], conn)
      await execute(
        `INSERT INTO contractor_credentials (contractor_id, username, password_hash, must_change_password) VALUES (?, ?, ?, 1)`,
        [contractorId, username, passwordHash],
        conn,
      )
      await execute('INSERT INTO contractor_notification_preferences (contractor_id) VALUES (?)', [contractorId], conn)
      await execute(
        `INSERT INTO reward_balances (contractor_id, currency, token_category_id) VALUES (?, 'points', 0)`,
        [contractorId],
        conn,
      )
      await execute(
        `INSERT INTO contractor_verifications (contractor_id, action, note, admin_id) VALUES (?, 'submitted', NULL, ?)`,
        [contractorId, admin.adminId],
        conn,
      )
      if (input.activateNow) {
        await execute(
          `INSERT INTO contractor_verifications (contractor_id, action, note, admin_id) VALUES (?, 'activated', 'Activated on creation', ?)`,
          [contractorId, admin.adminId],
          conn,
        )
      }
      await writeAudit(
        {
          actorType: 'admin',
          actorId: admin.adminId,
          action: 'contractor.created',
          entityType: 'contractor',
          entityId: contractorId,
          summary: `Created ${input.name} (${contractorCode}) as ${status}`,
        },
        conn,
      )
      return {
        ok: true as const,
        credentials: { contractorId, contractorCode, name: input.name, mobile: input.mobile, username, temporaryPassword },
      }
    })
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const message = String((error as Error).message)
      if (message.includes('uq_contractors_mobile'))
        return { ok: false, error: 'A contractor with this mobile number already exists.', field: 'mobile' }
      if (message.includes('uq_credentials_username'))
        return { ok: false, error: 'This username is already taken.', field: 'username' }
    }
    throw error
  }
}

export async function updateContractorDetails(admin: AdminSession, contractorId: number, input: ContractorDetailsInput) {
  try {
    const result = await withTransaction(async (conn) => {
      const updated = await execute(
      `UPDATE contractors SET name = ?, mobile = ?, alternate_mobile = ?, email = ?, address = ?, area = ?, city = ?,
         district = ?, state = ?, pin_code = ?, joining_date = ?, notes = ?
       WHERE id = ?`,
      [
        input.name,
        input.mobile,
        input.alternateMobile,
        input.email,
        input.address,
        input.area,
        input.city,
        input.district,
        input.state,
        input.pinCode,
        input.joiningDate,
        input.notes,
        contractorId,
      ],
      conn,
      )
      if (updated.affectedRows > 0) {
        await execute('UPDATE contractor_credentials SET username = ? WHERE contractor_id = ?', [input.mobile, contractorId], conn)
      }
      return updated
    })
    if (result.affectedRows === 0) return { ok: false as const, error: 'Contractor not found.' }
    await writeAudit({
      actorType: 'admin',
      actorId: admin.adminId,
      action: 'contractor.updated',
      entityType: 'contractor',
      entityId: contractorId,
      summary: `Updated details for ${input.name}`,
    })
    return { ok: true as const }
  } catch (error) {
    if (isDuplicateKeyError(error)) return { ok: false as const, error: 'Another contractor already uses this mobile number.' }
    throw error
  }
}

export type StatusAction = 'approve' | 'verify' | 'reject' | 'suspend' | 'reactivate' | 'deactivate' | 'archive' | 'unarchive'

const STATUS_TRANSITIONS: Record<
  StatusAction,
  { from: AccountStatus[]; to?: AccountStatus; verification?: VerificationStatus; log: string; revoke?: boolean }
> = {
  approve: { from: ['pending_approval'], to: 'active', verification: 'verified', log: 'activated' },
  verify: { from: ['pending_approval', 'active', 'suspended', 'inactive'], verification: 'verified', log: 'verified' },
  reject: { from: ['pending_approval'], to: 'inactive', verification: 'rejected', log: 'rejected', revoke: true },
  suspend: { from: ['active'], to: 'suspended', log: 'suspended', revoke: true },
  reactivate: { from: ['suspended', 'inactive', 'archived'], to: 'active', log: 'reactivated' },
  deactivate: { from: ['active', 'suspended', 'pending_approval'], to: 'inactive', log: 'deactivated', revoke: true },
  archive: { from: ['pending_approval', 'active', 'suspended', 'inactive'], to: 'archived', log: 'archived', revoke: true },
  unarchive: { from: ['archived'], to: 'inactive', log: 'unarchived' },
}

export async function changeContractorStatus(admin: AdminSession, contractorId: number, action: StatusAction, note: string | null) {
  const rule = STATUS_TRANSITIONS[action]
  const outcome = await withTransaction(async (conn) => {
    const current = await queryOne<{ account_status: AccountStatus; name: string }>(
      'SELECT account_status, name FROM contractors WHERE id = ? FOR UPDATE',
      [contractorId],
      conn,
    )
    if (!current) return { ok: false as const, error: 'Contractor not found.' }
    if (!rule.from.includes(current.account_status)) {
      return { ok: false as const, error: `Cannot ${action} a contractor whose status is ${current.account_status.replace('_', ' ')}.` }
    }
    const sets: string[] = []
    const params: unknown[] = []
    if (rule.to) {
      sets.push('account_status = ?')
      params.push(rule.to)
    }
    if (rule.verification) {
      sets.push('verification_status = ?')
      params.push(rule.verification)
    }
    if (action === 'approve') {
      sets.push('approved_at = UTC_TIMESTAMP(), approved_by_admin_id = ?')
      params.push(admin.adminId)
    }
    await execute(`UPDATE contractors SET ${sets.join(', ')} WHERE id = ?`, [...params, contractorId], conn)
    await execute(
      'INSERT INTO contractor_verifications (contractor_id, action, note, admin_id) VALUES (?, ?, ?, ?)',
      [contractorId, rule.log, note, admin.adminId],
      conn,
    )
    await writeAudit(
      {
        actorType: 'admin',
        actorId: admin.adminId,
        action: `contractor.${action}`,
        entityType: 'contractor',
        entityId: contractorId,
        summary: `${action} ${current.name}${note ? `: ${note}` : ''}`,
      },
      conn,
    )
    return { ok: true as const }
  })
  if (outcome.ok && rule.revoke) await revokeAllSessions('contractor', contractorId)
  return outcome
}

// Contractors with sales, claims, or ledger entries keep their financial history; those must be archived instead.
export async function deleteContractor(admin: AdminSession, contractorId: number) {
  const outcome = await withTransaction(async (conn) => {
    const c = await queryOne<{ name: string; contractor_code: string }>(
      'SELECT name, contractor_code FROM contractors WHERE id = ? FOR UPDATE',
      [contractorId],
      conn,
    )
    if (!c) return { ok: false as const, error: 'Contractor not found.' }
    const history = await queryOne<{ n: number }>(
      `SELECT (SELECT COUNT(*) FROM reward_activities WHERE contractor_id = ?)
            + (SELECT COUNT(*) FROM redemption_requests WHERE contractor_id = ?)
            + (SELECT COUNT(*) FROM reward_transactions WHERE contractor_id = ?) AS n`,
      [contractorId, contractorId, contractorId],
      conn,
    )
    if (Number(history?.n ?? 0) > 0) {
      return { ok: false as const, error: `${c.name} has sales, claims, or ledger history. Archive the account instead.` }
    }
    await execute('DELETE FROM reward_balances WHERE contractor_id = ?', [contractorId], conn)
    await execute('DELETE FROM contractors WHERE id = ?', [contractorId], conn)
    await writeAudit(
      {
        actorType: 'admin',
        actorId: admin.adminId,
        action: 'contractor.deleted',
        entityType: 'contractor',
        entityId: contractorId,
        summary: `Deleted ${c.name} (${c.contractor_code})`,
      },
      conn,
    )
    return { ok: true as const }
  })
  return outcome
}

export async function setContractorPhoto(
  actor: { type: 'admin' | 'contractor'; id: number },
  contractorId: number,
  photoUrl: string | null,
) {
  const r = await execute('UPDATE contractors SET photo_url = ? WHERE id = ?', [photoUrl, contractorId])
  if (r.affectedRows === 0) return { ok: false as const, error: 'Contractor not found.' }
  await writeAudit({
    actorType: actor.type,
    actorId: actor.id,
    action: photoUrl ? 'contractor.photo_updated' : 'contractor.photo_removed',
    entityType: 'contractor',
    entityId: contractorId,
  })
  return { ok: true as const }
}

export async function resetContractorPassword(admin: AdminSession, contractorId: number) {
  const contractor = await queryOne<{ name: string; mobile: string; contractor_code: string; username: string }>(
    `SELECT c.name, c.mobile, c.contractor_code, cc.username
     FROM contractors c JOIN contractor_credentials cc ON cc.contractor_id = c.id WHERE c.id = ?`,
    [contractorId],
  )
  if (!contractor) return { ok: false as const, error: 'Contractor not found.' }
  const temporaryPassword = contractor.mobile
  const hash = await hashPassword(temporaryPassword)
  await withTransaction(async (conn) => {
    await execute(
      `UPDATE contractor_credentials SET password_hash = ?, must_change_password = 1, failed_attempts = 0, locked_until = NULL
       WHERE contractor_id = ?`,
      [hash, contractorId],
      conn,
    )
    await execute(
      `INSERT INTO contractor_verifications (contractor_id, action, note, admin_id) VALUES (?, 'password_reset', NULL, ?)`,
      [contractorId, admin.adminId],
      conn,
    )
    await writeAudit(
      {
        actorType: 'admin',
        actorId: admin.adminId,
        action: 'contractor.password_reset',
        entityType: 'contractor',
        entityId: contractorId,
        summary: `Reset password for ${contractor.name}`,
      },
      conn,
    )
  })
  await revokeAllSessions('contractor', contractorId)
  return {
    ok: true as const,
    credentials: {
      contractorId,
      contractorCode: contractor.contractor_code,
      name: contractor.name,
      mobile: contractor.mobile,
      username: contractor.username,
      temporaryPassword,
    } satisfies IssuedCredentials,
  }
}

export async function unlockContractor(admin: AdminSession, contractorId: number) {
  await execute('UPDATE contractor_credentials SET failed_attempts = 0, locked_until = NULL WHERE contractor_id = ?', [
    contractorId,
  ])
  await writeAudit({
    actorType: 'admin',
    actorId: admin.adminId,
    action: 'contractor.unlocked',
    entityType: 'contractor',
    entityId: contractorId,
  })
  return { ok: true as const }
}

export const adjustmentSchema = z.object({
  direction: z.enum(['credit', 'debit']),
  currency: z.enum(['points', 'tokens']).default('points'),
  amount: z.coerce.number().int('Whole points only.').min(1, 'Enter at least 1 point.').max(10_000_000),
  reason: z.string().trim().min(5, 'Give a reason of at least 5 characters.').max(255),
  idempotencyKey: z.string().uuid(),
})

export async function adjustContractorPoints(admin: AdminSession, contractorId: number, input: z.infer<typeof adjustmentSchema>) {
  try {
    const result = await withTransaction(async (conn) => {
      const exists = await queryOne('SELECT 1 FROM contractors WHERE id = ? FOR UPDATE', [contractorId], conn)
      if (!exists) return { ok: false as const, error: 'Contractor not found.' }
      const tokenCategory =
        input.currency === 'tokens'
          ? await queryOne<{ id: number }>("SELECT id FROM token_categories WHERE code = 'general'", [], conn)
          : null
      const unit = input.currency === 'tokens' ? 'tokens' : 'points'
      const posted = await postLedgerEntry(conn, {
        contractorId,
        currency: input.currency,
        tokenCategoryId: tokenCategory?.id ?? null,
        entryType: input.direction === 'credit' ? 'manual_credit' : 'manual_debit',
        amount: input.amount,
        idempotencyKey: `manual:${input.idempotencyKey}`,
        reason: input.reason,
        actorType: 'admin',
        actorId: admin.adminId,
      })
      if (!posted.duplicate) {
        await writeAudit(
          {
            actorType: 'admin',
            actorId: admin.adminId,
            action: `ledger.manual_${input.direction}`,
            entityType: 'contractor',
            entityId: contractorId,
            summary: `${input.direction === 'credit' ? '+' : '-'}${input.amount} ${unit}: ${input.reason}`,
            metadata: { transactionId: posted.transactionId },
          },
          conn,
        )
        if (input.direction === 'credit') {
          const n = await execute(
            `INSERT INTO notifications (kind, event_type, title, body, created_by_type, created_by_id)
             VALUES ('reward', 'points_credited', 'Reward credited', ?, 'admin', ?)`,
            [`${input.amount.toLocaleString('en-IN')} ${unit} were added to your balance. ${input.reason}`.slice(0, 500), admin.adminId],
            conn,
          )
          await execute('INSERT INTO notification_recipients (notification_id, contractor_id) VALUES (?, ?)', [n.insertId, contractorId], conn)
        }
      }
      return { ok: true as const }
    })
    return result
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return { ok: false as const, error: 'Debit exceeds the available balance.' }
    }
    throw error
  }
}

export interface ContractorListRow {
  id: number
  contractor_code: string
  name: string
  mobile: string
  photo_url: string | null
  area: string | null
  city: string | null
  account_status: AccountStatus
  verification_status: VerificationStatus
  joining_date: string
  available: number
  pending: number
  last_login_at: string | null
}

export interface ContractorListFilters {
  q?: string
  status?: string
  verification?: string
  page?: number
}

export const CONTRACTOR_PAGE_SIZE = 20

export async function listContractors(filters: ContractorListFilters) {
  const where: string[] = ['1=1']
  const params: unknown[] = []
  if (filters.q) {
    where.push('(c.name LIKE ? OR c.mobile LIKE ? OR c.contractor_code LIKE ? OR cc.username LIKE ? OR c.area LIKE ?)')
    const like = `%${filters.q.replace(/[%_\\]/g, '\\$&')}%`
    params.push(like, like, like, like, like)
  }
  if (filters.status && ['pending_approval', 'active', 'suspended', 'inactive', 'archived'].includes(filters.status)) {
    where.push('c.account_status = ?')
    params.push(filters.status)
  } else {
    where.push("c.account_status <> 'archived'")
  }
  if (filters.verification && ['pending', 'verified', 'rejected'].includes(filters.verification)) {
    where.push('c.verification_status = ?')
    params.push(filters.verification)
  }
  const page = Math.max(1, filters.page ?? 1)
  const whereSql = where.join(' AND ')
  const [rows, total] = await Promise.all([
    query<ContractorListRow>(
      `SELECT c.id, c.contractor_code, c.name, c.mobile, c.photo_url, c.area, c.city, c.account_status, c.verification_status,
              c.joining_date, COALESCE(b.available, 0) AS available, COALESCE(b.pending, 0) AS pending, cc.last_login_at
       FROM contractors c
       LEFT JOIN contractor_credentials cc ON cc.contractor_id = c.id
       LEFT JOIN reward_balances b ON b.contractor_id = c.id AND b.currency = 'points' AND b.token_category_id = 0
       WHERE ${whereSql}
       ORDER BY c.created_at DESC, c.id DESC
       LIMIT ? OFFSET ?`,
      [...params, CONTRACTOR_PAGE_SIZE, (page - 1) * CONTRACTOR_PAGE_SIZE],
    ),
    queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n FROM contractors c LEFT JOIN contractor_credentials cc ON cc.contractor_id = c.id WHERE ${whereSql}`,
      params,
    ),
  ])
  return { rows, total: total?.n ?? 0, page }
}

export interface ContractorDetail {
  id: number
  contractor_code: string
  name: string
  mobile: string
  alternate_mobile: string | null
  email: string | null
  photo_url: string | null
  address: string | null
  area: string | null
  city: string | null
  district: string | null
  state: string | null
  pin_code: string | null
  joining_date: string
  notes: string | null
  account_status: AccountStatus
  verification_status: VerificationStatus
  approved_at: string | null
  created_at: string
  username: string
  must_change_password: number
  last_login_at: string | null
  locked: number
  failed_attempts: number
}

export async function getContractorDetail(id: number) {
  const contractor = await queryOne<ContractorDetail>(
    `SELECT c.*, cc.username, cc.must_change_password, cc.last_login_at, cc.failed_attempts,
            (cc.locked_until IS NOT NULL AND cc.locked_until > UTC_TIMESTAMP()) AS locked
     FROM contractors c JOIN contractor_credentials cc ON cc.contractor_id = c.id WHERE c.id = ?`,
    [id],
  )
  if (!contractor) return null
  const [balance, transactions, history, redemptions] = await Promise.all([
    queryOne<{ pending: number; available: number; reserved: number; redeemed: number; total_earned: number }>(
      `SELECT pending, available, reserved, redeemed, total_earned FROM reward_balances
       WHERE contractor_id = ? AND currency = 'points' AND token_category_id = 0`,
      [id],
    ),
    query<{ id: number; txn_code: string; entry_type: string; amount: number; available_after: number; reason: string | null; created_at: string }>(
      `SELECT id, txn_code, entry_type, amount, available_after, reason, created_at
       FROM reward_transactions WHERE contractor_id = ? ORDER BY id DESC LIMIT 25`,
      [id],
    ),
    query<{ id: number; action: string; note: string | null; created_at: string; admin_name: string | null }>(
      `SELECT v.id, v.action, v.note, v.created_at, a.name AS admin_name
       FROM contractor_verifications v LEFT JOIN admins a ON a.id = v.admin_id
       WHERE v.contractor_id = ? ORDER BY v.id DESC LIMIT 25`,
      [id],
    ),
    query<{ id: number; claim_code: string; gift_name: string; required_points: number; status: string; created_at: string }>(
      `SELECT id, claim_code, gift_name, required_points, status, created_at
       FROM redemption_requests WHERE contractor_id = ? ORDER BY id DESC LIMIT 10`,
      [id],
    ),
  ])
  return {
    contractor,
    balance: balance ?? { pending: 0, available: 0, reserved: 0, redeemed: 0, total_earned: 0 },
    transactions,
    history,
    redemptions,
  }
}
