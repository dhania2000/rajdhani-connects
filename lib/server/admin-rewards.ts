import { z } from 'zod'
import { execute, padCode, query, queryOne, withTransaction } from './db'
import { writeAudit } from './audit'
import { postLedgerEntry } from './ledger'
import { notifyContractor } from './rewards-engine'
import type { AdminSession } from './auth'

const optionalString = (max: number) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : null), z.string().max(max).nullable())
const checkbox = z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean())
const optionalUrl = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() ? v.trim() : null),
  z.string().max(500).refine((v) => v.startsWith('/') || /^https:\/\//.test(v), 'Use an https:// or /path URL.').nullable(),
)

// ---------------------------------------------------------------------------
// Gifts
// ---------------------------------------------------------------------------

export const giftSchema = z.object({
  name: z.string().trim().min(2, 'Gift name is required.').max(150),
  category: optionalString(80),
  description: optionalString(2000),
  imageUrl: optionalUrl,
  requiredPoints: z.coerce.number().int().min(0).max(100_000_000),
  requiredTokens: z.coerce.number().int().min(0).max(100_000_000),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  eligibilityNote: optionalString(255),
  terms: optionalString(4000),
  isVisible: checkbox,
  isFeatured: checkbox,
  redemptionEnabled: checkbox,
  displayOrder: z.coerce.number().int().min(0).max(100000).default(0),
})
export type GiftInput = z.infer<typeof giftSchema>

export interface GiftRow {
  id: number
  gift_code: string
  name: string
  category: string | null
  description: string | null
  image_url: string | null
  required_points: number
  required_tokens: number
  eligibility_note: string | null
  terms: string | null
  is_visible: number
  is_featured: number
  redemption_enabled: number
  display_order: number
  status: string
  total_quantity: number
  reserved_quantity: number
  issued_quantity: number
}

export async function listGifts() {
  return query<GiftRow>(
    `SELECT g.*, COALESCE(s.total_quantity, 0) AS total_quantity, COALESCE(s.reserved_quantity, 0) AS reserved_quantity,
            COALESCE(s.issued_quantity, 0) AS issued_quantity
     FROM gift_catalogue g LEFT JOIN gift_availability s ON s.gift_id = g.id
     WHERE g.status <> 'archived' ORDER BY g.display_order, g.name`,
  )
}

export async function saveGift(admin: AdminSession, giftId: number | null, input: GiftInput) {
  return withTransaction(async (conn) => {
    let id = giftId
    const values = [
      input.name,
      input.category,
      input.description,
      input.imageUrl,
      input.requiredPoints,
      input.requiredTokens,
      input.eligibilityNote,
      input.terms,
      input.isVisible ? 1 : 0,
      input.isFeatured ? 1 : 0,
      input.redemptionEnabled ? 1 : 0,
      input.displayOrder,
    ]
    if (id) {
      const stock = await queryOne<{ reserved_quantity: number; issued_quantity: number }>(
        'SELECT reserved_quantity, issued_quantity FROM gift_availability WHERE gift_id = ? FOR UPDATE',
        [id],
        conn,
      )
      const committed = Number(stock?.reserved_quantity ?? 0) + Number(stock?.issued_quantity ?? 0)
      if (input.stock < committed) return { ok: false as const, error: `Stock cannot be below ${committed} (already reserved or issued).` }
      const r = await execute(
        `UPDATE gift_catalogue SET name = ?, category = ?, description = ?, image_url = ?, required_points = ?, required_tokens = ?,
           eligibility_note = ?, terms = ?, is_visible = ?, is_featured = ?, redemption_enabled = ?, display_order = ? WHERE id = ?`,
        [...values, id],
        conn,
      )
      if (!r.affectedRows) return { ok: false as const, error: 'Gift not found.' }
    } else {
      const r = await execute(
        `INSERT INTO gift_catalogue (gift_code, name, category, description, image_url, required_points, required_tokens,
           eligibility_note, terms, is_visible, is_featured, redemption_enabled, display_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [`TMP-${Date.now()}-${Math.random()}`.slice(0, 50), ...values],
        conn,
      )
      id = r.insertId
      await execute('UPDATE gift_catalogue SET gift_code = ? WHERE id = ?', [padCode('GIFT-', id, 4), id], conn)
    }
    await execute(
      `INSERT INTO gift_availability (gift_id, total_quantity) VALUES (?, ?) ON DUPLICATE KEY UPDATE total_quantity = VALUES(total_quantity)`,
      [id, input.stock],
      conn,
    )
    await writeAudit(
      { actorType: 'admin', actorId: admin.adminId, action: giftId ? 'gift.updated' : 'gift.created', entityType: 'gift', entityId: id, summary: input.name },
      conn,
    )
    return { ok: true as const }
  })
}

export async function archiveGift(admin: AdminSession, giftId: number) {
  const open = await queryOne(
    "SELECT 1 FROM redemption_requests WHERE gift_id = ? AND status IN ('requested','under_review','approved','ready_for_handover') LIMIT 1",
    [giftId],
  )
  if (open) return { ok: false as const, error: 'Close the open redemption requests for this gift first.' }
  await execute("UPDATE gift_catalogue SET status = 'archived', is_visible = 0 WHERE id = ?", [giftId])
  await writeAudit({ actorType: 'admin', actorId: admin.adminId, action: 'gift.archived', entityType: 'gift', entityId: giftId })
  return { ok: true as const }
}

// ---------------------------------------------------------------------------
// Redemptions
// ---------------------------------------------------------------------------

export type RedemptionStatus =
  | 'requested'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'ready_for_handover'
  | 'delivered'
  | 'completed'
  | 'cancelled'

const TRANSITIONS: Record<string, RedemptionStatus[]> = {
  requested: ['under_review', 'approved', 'rejected', 'cancelled'],
  under_review: ['approved', 'rejected', 'cancelled'],
  approved: ['ready_for_handover', 'delivered', 'cancelled'],
  ready_for_handover: ['delivered', 'cancelled'],
  delivered: ['completed'],
}

export function nextRedemptionStatuses(status: string) {
  return TRANSITIONS[status] ?? []
}

const STATUS_TITLES: Record<string, string> = {
  under_review: 'Gift claim under review',
  approved: 'Gift claim approved',
  rejected: 'Gift claim rejected',
  ready_for_handover: 'Gift ready for handover',
  delivered: 'Gift delivered',
  completed: 'Gift claim completed',
  cancelled: 'Gift claim cancelled',
}

export async function listRedemptions(status?: string) {
  const valid = status && Object.keys(STATUS_TITLES).concat('requested').includes(status)
  return query<{
    id: number
    claim_code: string
    contractor_id: number
    contractor_name: string
    contractor_mobile: string
    gift_name: string
    required_points: number
    required_tokens: number
    status: RedemptionStatus
    rejection_reason: string | null
    internal_note: string | null
    handover_reference: string | null
    created_at: string
    updated_at: string
  }>(
    `SELECT r.id, r.claim_code, r.contractor_id, c.name AS contractor_name, c.mobile AS contractor_mobile, r.gift_name,
            r.required_points, r.required_tokens, r.status, r.rejection_reason, r.internal_note, r.handover_reference, r.created_at, r.updated_at
     FROM redemption_requests r JOIN contractors c ON c.id = r.contractor_id
     ${valid ? 'WHERE r.status = ?' : ''}
     ORDER BY FIELD(r.status, 'requested', 'under_review', 'approved', 'ready_for_handover', 'delivered', 'completed', 'rejected', 'cancelled'), r.created_at DESC
     LIMIT 200`,
    valid ? [status] : [],
  )
}

/** Moves a claim through its lifecycle; reserved points are released on reject/cancel and converted to redeemed on delivery. */
export async function transitionRedemption(
  admin: AdminSession,
  redemptionId: number,
  to: RedemptionStatus,
  note: string | null,
  handoverReference: string | null,
) {
  return withTransaction(async (conn) => {
    const r = await queryOne<{
      id: number
      contractor_id: number
      gift_id: number
      gift_name: string
      required_points: number
      required_tokens: number
      status: string
      claim_code: string
    }>('SELECT * FROM redemption_requests WHERE id = ? FOR UPDATE', [redemptionId], conn)
    if (!r) return { ok: false as const, error: 'Request not found.' }
    if (!nextRedemptionStatuses(r.status).includes(to)) return { ok: false as const, error: `Cannot move from ${r.status} to ${to}.` }
    if ((to === 'rejected' || to === 'cancelled') && !note) return { ok: false as const, error: 'A reason is required.' }

    const release = to === 'rejected' || to === 'cancelled'
    const redeem = to === 'delivered'
    if (release || redeem) {
      const entryType = release ? 'release' : 'redeem'
      if (Number(r.required_points) > 0) {
        await postLedgerEntry(conn, {
          contractorId: r.contractor_id,
          entryType,
          amount: Number(r.required_points),
          idempotencyKey: `redemption:${r.id}:${entryType}:points`,
          reason: `${r.gift_name} (${r.claim_code}) ${to}`,
          redemptionId: r.id,
          actorType: 'admin',
          actorId: admin.adminId,
        })
      }
      if (Number(r.required_tokens) > 0) {
        const general = await queryOne<{ id: number }>("SELECT id FROM token_categories WHERE code = 'general'", [], conn)
        await postLedgerEntry(conn, {
          contractorId: r.contractor_id,
          currency: 'tokens',
          tokenCategoryId: general?.id ?? null,
          entryType,
          amount: Number(r.required_tokens),
          idempotencyKey: `redemption:${r.id}:${entryType}:tokens`,
          reason: `${r.gift_name} (${r.claim_code}) ${to}`,
          redemptionId: r.id,
          actorType: 'admin',
          actorId: admin.adminId,
        })
      }
      await execute(
        release
          ? 'UPDATE gift_availability SET reserved_quantity = IF(reserved_quantity > 0, reserved_quantity - 1, 0) WHERE gift_id = ?'
          : 'UPDATE gift_availability SET reserved_quantity = IF(reserved_quantity > 0, reserved_quantity - 1, 0), issued_quantity = issued_quantity + 1 WHERE gift_id = ?',
        [r.gift_id],
        conn,
      )
    }
    await execute(
      `UPDATE redemption_requests SET status = ?, reviewed_by_admin_id = ?, reviewed_at = UTC_TIMESTAMP(),
         rejection_reason = IF(? IN ('rejected','cancelled'), ?, rejection_reason),
         internal_note = COALESCE(?, internal_note),
         handover_reference = COALESCE(?, handover_reference),
         delivered_at = IF(? = 'delivered', UTC_TIMESTAMP(), delivered_at),
         completed_at = IF(? = 'completed', UTC_TIMESTAMP(), completed_at),
         cancelled_at = IF(? = 'cancelled', UTC_TIMESTAMP(), cancelled_at)
       WHERE id = ?`,
      [to, admin.adminId, to, note, note, handoverReference, to, to, to, r.id],
      conn,
    )
    await execute(
      `INSERT INTO redemption_status_history (redemption_id, from_status, to_status, note, actor_type, actor_id) VALUES (?, ?, ?, ?, 'admin', ?)`,
      [r.id, r.status, to, note, admin.adminId],
      conn,
    )
    await writeAudit(
      { actorType: 'admin', actorId: admin.adminId, action: `redemption.${to}`, entityType: 'redemption', entityId: r.id, summary: `${r.claim_code} ${r.status} -> ${to}` },
      conn,
    )
    await notifyContractor(
      conn,
      r.contractor_id,
      'reward',
      `redemption_${to}`,
      STATUS_TITLES[to] ?? 'Gift claim updated',
      `${r.gift_name} (${r.claim_code}): ${to.replace(/_/g, ' ')}${note && release ? ` - ${note}` : ''}.`,
      admin.adminId,
    )
    return { ok: true as const }
  })
}

/** Direct gift assignment: issues a gift to a contractor without deducting points. */
export async function assignGift(admin: AdminSession, contractorId: number, giftId: number, note: string) {
  return withTransaction(async (conn) => {
    const gift = await queryOne<{ name: string; total_quantity: number; reserved_quantity: number; issued_quantity: number }>(
      `SELECT g.name, COALESCE(s.total_quantity,0) AS total_quantity, COALESCE(s.reserved_quantity,0) AS reserved_quantity,
              COALESCE(s.issued_quantity,0) AS issued_quantity
       FROM gift_catalogue g LEFT JOIN gift_availability s ON s.gift_id = g.id WHERE g.id = ? AND g.status = 'active' FOR UPDATE`,
      [giftId],
      conn,
    )
    if (!gift) return { ok: false as const, error: 'Gift not found.' }
    if (Number(gift.total_quantity) - Number(gift.reserved_quantity) - Number(gift.issued_quantity) < 1) {
      return { ok: false as const, error: 'This gift is out of stock.' }
    }
    const contractor = await queryOne('SELECT 1 FROM contractors WHERE id = ?', [contractorId], conn)
    if (!contractor) return { ok: false as const, error: 'Contractor not found.' }
    const r = await execute(
      `INSERT INTO redemption_requests (contractor_id, gift_id, gift_name, required_points, required_tokens, status, idempotency_key, internal_note, reviewed_by_admin_id, reviewed_at)
       VALUES (?, ?, ?, 0, 0, 'approved', ?, ?, ?, UTC_TIMESTAMP())`,
      [contractorId, giftId, gift.name, `assign:${Date.now()}:${Math.random()}`.slice(0, 64), note, admin.adminId],
      conn,
    )
    await execute('UPDATE redemption_requests SET claim_code = ? WHERE id = ?', [padCode('CLM-', r.insertId), r.insertId], conn)
    await execute('UPDATE gift_availability SET reserved_quantity = reserved_quantity + 1 WHERE gift_id = ?', [giftId], conn)
    await execute(
      `INSERT INTO redemption_status_history (redemption_id, from_status, to_status, note, actor_type, actor_id) VALUES (?, NULL, 'approved', ?, 'admin', ?)`,
      [r.insertId, `Direct assignment: ${note}`, admin.adminId],
      conn,
    )
    await writeAudit({ actorType: 'admin', actorId: admin.adminId, action: 'gift.assigned', entityType: 'redemption', entityId: r.insertId, summary: `${gift.name}: ${note}` }, conn)
    await notifyContractor(conn, contractorId, 'reward', 'gift_assigned', 'A gift has been assigned to you', `${gift.name} - ${note}`, admin.adminId)
    return { ok: true as const }
  })
}

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export const offerSchema = z
  .object({
    title: z.string().trim().min(3, 'Title is required.').max(150),
    description: optionalString(4000),
    bannerUrl: optionalUrl,
    audience: z.enum(['all', 'specific']),
    contractorIds: z.preprocess(
      (v) =>
        typeof v === 'string'
          ? v
              .split(/[\s,]+/)
              .map((s) => Number(s))
              .filter((n) => Number.isInteger(n) && n > 0)
          : [],
      z.array(z.number()).max(5000),
    ),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a start date.'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select an end date.'),
    rewardType: z.enum(['points', 'tokens', 'gift', 'multiplier', 'info']),
    targetValue: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(0).nullable()),
    targetUnit: z.preprocess((v) => (v ? v : null), z.enum(['points', 'tokens', 'amount', 'quantity']).nullable()),
    rewardValue: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().min(0).nullable()),
    showProgress: checkbox,
    isFeatured: checkbox,
    terms: optionalString(4000),
    status: z.enum(['draft', 'published', 'archived']),
  })
  .refine((o) => o.startDate <= o.endDate, { message: 'End date must be on or after the start date.', path: ['endDate'] })
  .refine((o) => o.audience === 'all' || o.contractorIds.length > 0, { message: 'Add at least one contractor ID.', path: ['contractorIds'] })
export type OfferInput = z.infer<typeof offerSchema>

export async function listOffers() {
  return query<{
    id: number
    offer_code: string
    title: string
    description: string | null
    banner_url: string | null
    audience: 'all' | 'specific'
    start_date: string
    end_date: string
    reward_type: string
    target_value: number | null
    target_unit: string | null
    reward_value: number | null
    show_progress: number
    is_featured: number
    terms: string | null
    status: 'draft' | 'published' | 'archived'
    audience_ids: string | null
  }>(
    `SELECT o.*, (SELECT GROUP_CONCAT(contractor_id) FROM offer_contractors a WHERE a.offer_id = o.id) AS audience_ids
     FROM offers o WHERE o.status <> 'archived' ORDER BY o.status = 'published' DESC, o.start_date DESC`,
  )
}

export async function saveOffer(admin: AdminSession, offerId: number | null, input: OfferInput) {
  return withTransaction(async (conn) => {
    const values = [
      input.title,
      input.description,
      input.bannerUrl,
      input.audience,
      input.startDate,
      input.endDate,
      input.rewardType,
      input.targetValue,
      input.targetUnit,
      input.rewardValue,
      input.showProgress ? 1 : 0,
      input.isFeatured ? 1 : 0,
      input.terms,
      input.status,
    ]
    let id = offerId
    let wasPublished = false
    if (id) {
      const prev = await queryOne<{ status: string }>('SELECT status FROM offers WHERE id = ? FOR UPDATE', [id], conn)
      if (!prev) return { ok: false as const, error: 'Offer not found.' }
      wasPublished = prev.status === 'published'
      await execute(
        `UPDATE offers SET title = ?, description = ?, banner_url = ?, audience = ?, start_date = ?, end_date = ?, reward_type = ?,
           target_value = ?, target_unit = ?, reward_value = ?, show_progress = ?, is_featured = ?, terms = ?, status = ? WHERE id = ?`,
        [...values, id],
        conn,
      )
      await execute('DELETE FROM offer_contractors WHERE offer_id = ?', [id], conn)
    } else {
      const r = await execute(
        `INSERT INTO offers (title, description, banner_url, audience, start_date, end_date, reward_type, target_value, target_unit,
           reward_value, show_progress, is_featured, terms, status, created_by_admin_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [...values, admin.adminId],
        conn,
      )
      id = r.insertId
      await execute('UPDATE offers SET offer_code = ? WHERE id = ?', [padCode('OFR-', id, 4), id], conn)
    }
    let recipients: number[] = []
    if (input.audience === 'specific') {
      const rows = await query<{ id: number }>(
        `SELECT id FROM contractors WHERE id IN (${input.contractorIds.map(() => '?').join(',')})`,
        input.contractorIds,
        conn,
      )
      recipients = rows.map((r) => r.id)
      if (!recipients.length) return { ok: false as const, error: 'None of the contractor IDs exist.' }
      for (const cid of recipients) await execute('INSERT INTO offer_contractors (offer_id, contractor_id) VALUES (?, ?)', [id, cid], conn)
    }
    if (input.status === 'published' && !wasPublished) {
      const n = await execute(
        `INSERT INTO notifications (kind, event_type, title, body, created_by_type, created_by_id) VALUES ('offer', 'offer_published', ?, ?, 'admin', ?)`,
        [`New offer: ${input.title}`.slice(0, 150), (input.description ?? 'A new offer is available.').slice(0, 500), admin.adminId],
        conn,
      )
      await execute(
        input.audience === 'all'
          ? "INSERT INTO notification_recipients (notification_id, contractor_id) SELECT ?, id FROM contractors WHERE account_status = 'active'"
          : `INSERT INTO notification_recipients (notification_id, contractor_id) SELECT ?, id FROM contractors WHERE id IN (${recipients.map(() => '?').join(',')})`,
        [n.insertId, ...(input.audience === 'all' ? [] : recipients)],
        conn,
      )
    }
    await writeAudit(
      { actorType: 'admin', actorId: admin.adminId, action: offerId ? 'offer.updated' : 'offer.created', entityType: 'offer', entityId: id, summary: `${input.title} (${input.status})` },
      conn,
    )
    return { ok: true as const }
  })
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const broadcastSchema = z
  .object({
    title: z.string().trim().min(3, 'Title is required.').max(150),
    body: z.string().trim().min(3, 'Message is required.').max(500),
    audience: z.enum(['all', 'specific']),
    contractorIds: z.preprocess(
      (v) =>
        typeof v === 'string'
          ? v
              .split(/[\s,]+/)
              .map(Number)
              .filter((n) => Number.isInteger(n) && n > 0)
          : [],
      z.array(z.number()).max(5000),
    ),
  })
  .refine((b) => b.audience === 'all' || b.contractorIds.length > 0, { message: 'Add at least one contractor ID.', path: ['contractorIds'] })

export async function sendBroadcast(admin: AdminSession, input: z.infer<typeof broadcastSchema>) {
  return withTransaction(async (conn) => {
    const n = await execute(
      `INSERT INTO notifications (kind, event_type, title, body, created_by_type, created_by_id) VALUES ('system', 'admin_broadcast', ?, ?, 'admin', ?)`,
      [input.title, input.body, admin.adminId],
      conn,
    )
    const r = await execute(
      input.audience === 'all'
        ? "INSERT INTO notification_recipients (notification_id, contractor_id) SELECT ?, id FROM contractors WHERE account_status = 'active'"
        : `INSERT INTO notification_recipients (notification_id, contractor_id) SELECT ?, id FROM contractors WHERE id IN (${input.contractorIds.map(() => '?').join(',')})`,
      [n.insertId, ...(input.audience === 'all' ? [] : input.contractorIds)],
      conn,
    )
    await writeAudit({ actorType: 'admin', actorId: admin.adminId, action: 'notification.sent', entityType: 'notification', entityId: n.insertId, summary: `${input.title} -> ${r.affectedRows}` }, conn)
    return { ok: true as const, recipients: r.affectedRows }
  })
}

export async function listSentNotifications() {
  return query<{ id: number; kind: string; title: string; body: string; created_at: string; recipients: number; read_count: number }>(
    `SELECT n.id, n.kind, n.title, n.body, n.created_at,
            COUNT(r.id) AS recipients, COUNT(r.read_at) AS read_count
     FROM notifications n LEFT JOIN notification_recipients r ON r.notification_id = n.id
     GROUP BY n.id ORDER BY n.created_at DESC LIMIT 50`,
  )
}

// ---------------------------------------------------------------------------
// Contractor app content configuration
// ---------------------------------------------------------------------------

export const QUICK_ACTION_KEYS = ['sales', 'rewards', 'claim', 'catalogue', 'offers', 'ledger'] as const
export type QuickActionKey = (typeof QUICK_ACTION_KEYS)[number]

export const appContentSchema = z.object({
  brandName: z.string().trim().min(2).max(80),
  storePhone: z.string().trim().max(20).regex(/^[+\d\s-]*$/, 'Store phone can contain digits, spaces, + and - only.').default(''),
  welcomeText: z.string().trim().max(200),
  rewardCardTitle: z.string().trim().min(2).max(60),
  redeemButtonText: z.string().trim().min(2).max(40),
  pointsLabel: z.string().trim().min(2).max(30),
  tokensLabel: z.string().trim().min(2).max(30),
  supportMessage: z.string().trim().max(300),
  ledgerComingSoon: checkbox,
  ledgerMessage: z.string().trim().max(200),
  activityApprovalMode: z.enum(['manual', 'auto']),
  quickActions: z.array(
    z.object({ key: z.enum(QUICK_ACTION_KEYS), title: z.string().trim().min(2).max(40), subtitle: z.string().trim().max(60), visible: z.boolean() }),
  ),
})
export type AppContent = z.infer<typeof appContentSchema>

export const DEFAULT_APP_CONTENT: AppContent = {
  brandName: 'Rajdhani Connects',
  storePhone: '',
  welcomeText: 'Welcome,',
  rewardCardTitle: 'Your Rewards',
  redeemButtonText: 'Redeem Now',
  pointsLabel: 'pts',
  tokensLabel: 'Tokens',
  supportMessage: 'For password resets or account changes, contact Rajdhani Connects.',
  ledgerComingSoon: false,
  ledgerMessage: 'Your account ledger will be available here soon.',
  activityApprovalMode: 'manual',
  quickActions: [
    { key: 'sales', title: 'My Sales', subtitle: '(Referrals)', visible: true },
    { key: 'rewards', title: 'Earned Rewards', subtitle: '', visible: true },
    { key: 'claim', title: 'Claim Reward', subtitle: '', visible: true },
    { key: 'catalogue', title: 'Product Catalogue', subtitle: '', visible: true },
    { key: 'offers', title: 'Offers & Schemes', subtitle: '', visible: true },
    { key: 'ledger', title: 'My Ledger', subtitle: '(Udhar/Advance)', visible: false },
  ],
}

export async function getAppContent(): Promise<AppContent> {
  const [row, legacyPhone] = await Promise.all([
    queryOne<{ config_value: string }>("SELECT config_value FROM contractor_app_configuration WHERE config_key = 'app_content'"),
    queryOne<{ config_value: string }>("SELECT config_value FROM contractor_app_configuration WHERE config_key = 'store_phone'"),
  ])
  const defaults = { ...DEFAULT_APP_CONTENT, storePhone: legacyPhone?.config_value ?? '' }
  if (!row) return defaults
  try {
    const raw = JSON.parse(row.config_value) as Record<string, unknown>
    const parsed = appContentSchema.partial().safeParse(raw)
    const valid = parsed.success ? parsed.data : {}
    const savedActions = Array.isArray(raw.quickActions) ? (raw.quickActions as AppContent['quickActions']) : []
    const merged: AppContent = { ...defaults, ...valid, storePhone: valid.storePhone || defaults.storePhone }
    merged.quickActions = DEFAULT_APP_CONTENT.quickActions.map((d) => {
      const saved = savedActions.find((q) => q?.key === d.key)
      return saved && typeof saved.title === 'string' ? { ...d, ...saved } : d
    })
    return merged
  } catch {
    return defaults
  }
}

export async function saveAppContent(admin: AdminSession, content: AppContent) {
  await execute(
    `INSERT INTO contractor_app_configuration (config_key, config_value, updated_by_admin_id) VALUES ('app_content', ?, ?)
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_by_admin_id = VALUES(updated_by_admin_id)`,
    [JSON.stringify(content), admin.adminId],
  )
  await writeAudit({ actorType: 'admin', actorId: admin.adminId, action: 'app_content.updated', entityType: 'app_config', summary: 'Contractor app content updated' })
  return { ok: true as const }
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export async function getDashboardMetrics() {
  const [counts] = await query<{
    contractors_total: number
    contractors_active: number
    contractors_pending: number
    activities_pending: number
    redemptions_open: number
    points_available: number
    points_reserved: number
    tokens_available: number
  }>(
    `SELECT
       (SELECT COUNT(*) FROM contractors) AS contractors_total,
       (SELECT COUNT(*) FROM contractors WHERE account_status = 'active') AS contractors_active,
       (SELECT COUNT(*) FROM contractors WHERE account_status = 'pending_approval') AS contractors_pending,
       (SELECT COUNT(*) FROM reward_activities WHERE status = 'submitted') AS activities_pending,
       (SELECT COUNT(*) FROM redemption_requests WHERE status IN ('requested','under_review','approved','ready_for_handover')) AS redemptions_open,
       (SELECT COALESCE(SUM(available),0) FROM reward_balances WHERE currency = 'points') AS points_available,
       (SELECT COALESCE(SUM(reserved),0) FROM reward_balances WHERE currency = 'points') AS points_reserved,
       (SELECT COALESCE(SUM(available),0) FROM reward_balances WHERE currency = 'tokens') AS tokens_available`,
  )
  const monthly = await query<{ month: string; issued: number; redeemed: number }>(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
            COALESCE(SUM(CASE WHEN entry_type IN ('earn','manual_credit') THEN amount END), 0) AS issued,
            COALESCE(SUM(CASE WHEN entry_type = 'redeem' THEN amount END), 0) AS redeemed
     FROM reward_transactions WHERE currency = 'points' AND created_at >= DATE_SUB(UTC_DATE(), INTERVAL 6 MONTH)
     GROUP BY month ORDER BY month`,
  )
  const top = await query<{ id: number; name: string; contractor_code: string; earned: number; sales: number }>(
    `SELECT c.id, c.name, c.contractor_code,
            COALESCE((SELECT SUM(amount) FROM reward_transactions t WHERE t.contractor_id = c.id AND t.currency = 'points' AND t.entry_type IN ('earn','manual_credit')), 0) AS earned,
            COALESCE((SELECT SUM(eligible_amount) FROM reward_activities a WHERE a.contractor_id = c.id AND a.status = 'approved'), 0) AS sales
     FROM contractors c ORDER BY earned DESC, sales DESC LIMIT 5`,
  )
  const recent = await query<{
    id: number
    action: string
    summary: string | null
    created_at: string
    actor_type: 'admin' | 'contractor' | 'system'
    entity_type: string
    actor_name: string | null
  }>(
    `SELECT l.id, l.action, l.summary, l.created_at, l.actor_type, l.entity_type,
            CASE l.actor_type WHEN 'admin' THEN a.name WHEN 'contractor' THEN c.name ELSE NULL END AS actor_name
     FROM audit_logs l
     LEFT JOIN admins a ON l.actor_type = 'admin' AND a.id = l.actor_id
     LEFT JOIN contractors c ON l.actor_type = 'contractor' AND c.id = l.actor_id
     ORDER BY l.id DESC LIMIT 8`,
  )
  return { counts: counts!, monthly, top, recent }
}

export async function listContractorOptions() {
  return query<{ id: number; name: string; contractor_code: string; mobile: string }>(
    "SELECT id, name, contractor_code, mobile FROM contractors WHERE account_status IN ('active','pending_approval') ORDER BY name LIMIT 2000",
  )
}

export async function listRecentTransactions(limit = 50) {
  return query<{
    id: number
    txn_code: string | null
    contractor_id: number
    contractor_name: string
    currency: 'points' | 'tokens'
    entry_type: string
    amount: number
    available_after: number
    reason: string | null
    created_by_type: string
    created_at: string
  }>(
    `SELECT t.id, t.txn_code, t.contractor_id, c.name AS contractor_name, t.currency, t.entry_type, t.amount, t.available_after,
            t.reason, t.created_by_type, t.created_at
     FROM reward_transactions t JOIN contractors c ON c.id = t.contractor_id
     ORDER BY t.id DESC LIMIT ?`,
    [limit],
  )
}

export async function getRewardsOverview() {
  const [row] = await query<Record<string, number>>(
    `SELECT
       (SELECT COUNT(*) FROM reward_rules WHERE status = 'active') AS active_rules,
       (SELECT COALESCE(SUM(amount),0) FROM reward_transactions WHERE currency = 'points' AND entry_type IN ('earn','manual_credit')) AS points_issued,
       (SELECT COALESCE(SUM(amount),0) FROM reward_transactions WHERE currency = 'tokens' AND entry_type IN ('earn','manual_credit')) AS tokens_issued,
       (SELECT COALESCE(SUM(available),0) FROM reward_balances WHERE currency = 'points') AS points_available,
       (SELECT COALESCE(SUM(available),0) FROM reward_balances WHERE currency = 'tokens') AS tokens_available,
       (SELECT COUNT(*) FROM reward_activities WHERE status = 'submitted') AS pending_entries,
       (SELECT COALESCE(SUM(amount),0) FROM reward_transactions WHERE currency = 'points' AND entry_type = 'redeem') AS points_redeemed,
       (SELECT COUNT(*) FROM redemption_requests WHERE status IN ('requested','under_review')) AS pending_claims,
       (SELECT COUNT(*) FROM gift_catalogue WHERE status = 'active' AND is_visible = 1) AS active_gifts,
       (SELECT COUNT(*) FROM offers WHERE status = 'published' AND UTC_DATE() BETWEEN start_date AND end_date) AS active_offers,
       (SELECT COUNT(*) FROM offers WHERE status = 'published' AND end_date BETWEEN UTC_DATE() AND DATE_ADD(UTC_DATE(), INTERVAL 14 DAY)) AS expiring_offers`,
  )
  return Object.fromEntries(Object.entries(row ?? {}).map(([k, v]) => [k, Number(v ?? 0)])) as Record<string, number>
}

export async function getReport(type: 'liability' | 'redemptions' | 'leaderboard' | 'ledger') {
  if (type === 'liability') {
    return query(
      `SELECT c.contractor_code, c.name, c.mobile, b.currency, b.available, b.reserved, b.redeemed, b.total_earned
       FROM reward_balances b JOIN contractors c ON c.id = b.contractor_id ORDER BY b.available DESC`,
    )
  }
  if (type === 'redemptions') {
    return query(
      `SELECT gift_name, COUNT(*) AS requests, SUM(status IN ('delivered','completed')) AS delivered,
              SUM(status IN ('rejected','cancelled')) AS declined, SUM(required_points) AS points
       FROM redemption_requests GROUP BY gift_name ORDER BY requests DESC`,
    )
  }
  if (type === 'leaderboard') {
    return query(
      `SELECT c.contractor_code, c.name, c.city,
              COUNT(a.id) AS approved_sales, COALESCE(SUM(a.eligible_amount), 0) AS sales_value
       FROM contractors c LEFT JOIN reward_activities a ON a.contractor_id = c.id AND a.status = 'approved'
       GROUP BY c.id ORDER BY sales_value DESC LIMIT 500`,
    )
  }
  return query(
    `SELECT t.created_at, c.contractor_code, c.name, t.currency, t.entry_type, t.amount, t.reason
     FROM reward_transactions t JOIN contractors c ON c.id = t.contractor_id ORDER BY t.id DESC LIMIT 5000`,
  )
}

export async function getContractorPerformance(contractorId: number, from: string, to: string) {
  const [row] = await query<{ sales: number; sales_value: number; points: number; tokens: number; pending: number }>(
    `SELECT
       (SELECT COUNT(*) FROM reward_activities WHERE contractor_id = ? AND status = 'approved' AND activity_date BETWEEN ? AND ?) AS sales,
       (SELECT COALESCE(SUM(eligible_amount),0) FROM reward_activities WHERE contractor_id = ? AND status = 'approved' AND activity_date BETWEEN ? AND ?) AS sales_value,
       (SELECT COALESCE(SUM(amount),0) FROM reward_transactions WHERE contractor_id = ? AND currency = 'points' AND entry_type IN ('earn','manual_credit') AND DATE(created_at) BETWEEN ? AND ?) AS points,
       (SELECT COALESCE(SUM(amount),0) FROM reward_transactions WHERE contractor_id = ? AND currency = 'tokens' AND entry_type IN ('earn','manual_credit') AND DATE(created_at) BETWEEN ? AND ?) AS tokens,
       (SELECT COUNT(*) FROM reward_activities WHERE contractor_id = ? AND status = 'submitted' AND activity_date BETWEEN ? AND ?) AS pending`,
    [contractorId, from, to, contractorId, from, to, contractorId, from, to, contractorId, from, to, contractorId, from, to],
  )
  return {
    sales: Number(row?.sales ?? 0),
    salesValue: Number(row?.sales_value ?? 0),
    points: Number(row?.points ?? 0),
    tokens: Number(row?.tokens ?? 0),
    pending: Number(row?.pending ?? 0),
  }
}

export async function getAdminAlertCount() {
  const row = await queryOne<{ total: number }>(
    `SELECT
       (SELECT COUNT(*) FROM reward_activities WHERE status = 'submitted') +
       (SELECT COUNT(*) FROM redemption_requests WHERE status = 'requested') AS total`,
  )
  return Number(row?.total ?? 0)
}
