import { execute, isDbConfigured, padCode, query, queryOne, withTransaction, isDuplicateKeyError } from './db'
import { DEFAULT_APP_CONTENT, getAppContent, type AppContent } from './admin-rewards'
import { getContractorRank } from './contractors'
import { writeAudit } from './audit'
import { getPointsBalance, InsufficientBalanceError, postLedgerEntry } from './ledger'
import type {
  AppNotification,
  ClaimStatus,
  ContractorProfile,
  Gift,
  GiftAvailability,
  NotificationPreferences,
  Offer,
  OfferTargetUnit,
  PerformanceMetrics,
  PerformancePeriod,
  Product,
  ProductCategory,
  RewardClaim,
  RewardSummary,
  RewardTransaction,
  SaleRecord,
  SchemeTarget,
} from '@/lib/types'

export interface ContractorAppState {
  profile: ContractorProfile
  availablePoints: number
  claims: RewardClaim[]
  preferences: NotificationPreferences
  unreadCount: number
  storePhone: string
  content: ContractorAppContent
  /** This contractor's own rank by points earned to date (0 points = not ranked yet). Other contractors are never included. */
  ranking: { rank: number; earned: number }
}

/** Admin-managed text and tile settings for the contractor app (Rewards Engine > App content). */
export type ContractorAppContent = Omit<AppContent, 'activityApprovalMode' | 'storePhone'>

function toAppContent(c: AppContent): ContractorAppContent {
  const { activityApprovalMode: _mode, storePhone: _phone, ...rest } = c
  return rest
}

/** Branding for screens shown before sign-in. Falls back to defaults when the database is unavailable. */
export async function getPublicBranding(): Promise<{ brandName: string; storePhone: string; supportMessage: string; logoUrl: string }> {
  const fallback = { brandName: DEFAULT_APP_CONTENT.brandName, storePhone: '', supportMessage: DEFAULT_APP_CONTENT.supportMessage, logoUrl: '' }
  if (!isDbConfigured()) return fallback
  try {
    const c = await getAppContent()
    return { brandName: c.brandName, storePhone: c.storePhone, supportMessage: c.supportMessage, logoUrl: c.logoUrl }
  } catch {
    return fallback
  }
}

const CLAIM_STATUS_MAP: Record<string, ClaimStatus> = {
  requested: 'requested',
  under_review: 'requested',
  approved: 'approved',
  ready_for_handover: 'approved',
  delivered: 'delivered',
  completed: 'delivered',
  rejected: 'rejected',
  cancelled: 'rejected',
}

const ACCOUNT_STATUS_LABEL: Record<string, ContractorProfile['accountStatus']> = {
  active: 'Active',
  suspended: 'Suspended',
  inactive: 'Inactive',
  pending_approval: 'Inactive',
  archived: 'Inactive',
}

function toDate(value: string) {
  return value.slice(0, 10)
}

export async function getContractorClaims(contractorId: number): Promise<RewardClaim[]> {
  const rows = await query<{ claim_code: string; gift_code: string; gift_name: string; required_points: number; status: string; created_at: string }>(
    `SELECT r.claim_code, g.gift_code, r.gift_name, r.required_points, r.status, r.created_at
     FROM redemption_requests r JOIN gift_catalogue g ON g.id = r.gift_id
     WHERE r.contractor_id = ? ORDER BY r.id DESC LIMIT 100`,
    [contractorId],
  )
  return rows.map((r) => ({
    id: r.claim_code,
    giftId: r.gift_code,
    giftName: r.gift_name,
    points: Number(r.required_points),
    requestedOn: toDate(r.created_at),
    status: CLAIM_STATUS_MAP[r.status] ?? 'requested',
  }))
}

export async function getContractorState(contractorId: number): Promise<ContractorAppState> {
  const [c, balance, claims, prefs, unread, content, ranking] = await Promise.all([
    queryOne<{
      contractor_code: string
      name: string
      photo_url: string | null
      verification_status: string
      mobile: string
      address: string | null
      area: string | null
      city: string | null
      joining_date: string
      account_status: string
    }>(
      `SELECT contractor_code, name, photo_url, verification_status, mobile, address, area, city, joining_date, account_status
       FROM contractors WHERE id = ?`,
      [contractorId],
    ),
    getPointsBalance(contractorId),
    getContractorClaims(contractorId),
    queryOne<{ rewards: number; sales: number; offers: number; sms: number }>(
      'SELECT rewards, sales, offers, sms FROM contractor_notification_preferences WHERE contractor_id = ?',
      [contractorId],
    ),
    queryOne<{ n: number }>(
      'SELECT COUNT(*) AS n FROM notification_recipients WHERE contractor_id = ? AND read_at IS NULL',
      [contractorId],
    ),
    getAppContent(),
    getContractorRank(contractorId),
  ])
  if (!c) throw new Error('Contractor not found')
  return {
    profile: {
      id: c.contractor_code,
      name: c.name,
      avatarUrl: c.photo_url ?? '',
      verified: c.verification_status === 'verified',
      mobile: c.mobile,
      address: [c.address, c.city].filter(Boolean).join(', '),
      area: c.area ?? '',
      joinedOn: toDate(c.joining_date),
      accountStatus: ACCOUNT_STATUS_LABEL[c.account_status] ?? 'Inactive',
    },
    availablePoints: Number(balance.available),
    claims,
    preferences: {
      rewards: Boolean(prefs?.rewards ?? 1),
      sales: Boolean(prefs?.sales ?? 1),
      offers: Boolean(prefs?.offers ?? 1),
      sms: Boolean(prefs?.sms ?? 0),
    },
    unreadCount: unread?.n ?? 0,
    storePhone: content.storePhone,
    content: toAppContent(content),
    ranking,
  }
}

export async function getRewardSummary(contractorId: number): Promise<RewardSummary> {
  const b = await getPointsBalance(contractorId)
  return {
    totalEarned: Number(b.total_earned),
    available: Number(b.available),
    pending: Number(b.pending),
    redeemed: Number(b.redeemed) + Number(b.reserved),
  }
}

const TXN_STATUS: Record<string, RewardTransaction['status'] | null> = {
  earn: 'credited',
  manual_credit: 'credited',
  pending_confirm: 'credited',
  earn_pending: 'pending',
  reserve: 'redeemed',
}

export async function getRewardTransactions(contractorId: number): Promise<RewardTransaction[]> {
  const rows = await query<{
    txn_code: string
    entry_type: string
    amount: number
    reason: string | null
    created_at: string
    reference_number: string | null
    product_ref: string | null
    claim_code: string | null
    gift_name: string | null
  }>(
    `SELECT t.txn_code, t.entry_type, t.amount, t.reason, t.created_at,
            a.reference_number, a.product_ref, r.claim_code, r.gift_name
     FROM reward_transactions t
     LEFT JOIN reward_activities a ON a.id = t.activity_id
     LEFT JOIN redemption_requests r ON r.id = t.redemption_id
     WHERE t.contractor_id = ? AND t.currency = 'points'
       AND t.entry_type IN ('earn','manual_credit','earn_pending','reserve')
     ORDER BY t.id DESC LIMIT 100`,
    [contractorId],
  )
  return rows.map((r) => ({
    id: r.txn_code,
    date: toDate(r.created_at),
    invoiceRef: r.reference_number ?? r.claim_code ?? r.txn_code,
    product: r.gift_name ? `${r.gift_name} (Gift)` : (r.product_ref ?? r.reason ?? 'Reward adjustment'),
    points: Number(r.amount),
    status: TXN_STATUS[r.entry_type] ?? 'credited',
  }))
}

interface GiftRow {
  gift_code: string
  name: string
  description: string | null
  image_url: string | null
  required_points: number
  redemption_enabled: number
  total_quantity: number | null
  reserved_quantity: number
  issued_quantity: number
  low_stock_threshold: number
}

function giftAvailability(row: GiftRow): GiftAvailability {
  if (!row.redemption_enabled) return 'out-of-stock'
  if (row.total_quantity === null) return 'in-stock'
  const remaining = row.total_quantity - row.reserved_quantity - row.issued_quantity
  if (remaining <= 0) return 'out-of-stock'
  if (remaining <= row.low_stock_threshold) return 'limited'
  return 'in-stock'
}

function toGift(row: GiftRow): Gift {
  return {
    id: row.gift_code,
    name: row.name,
    description: row.description ?? '',
    points: Number(row.required_points),
    image: row.image_url ?? '/placeholder.svg',
    availability: giftAvailability(row),
  }
}

const GIFT_SELECT = `SELECT g.gift_code, g.name, g.description, g.image_url, g.required_points, g.redemption_enabled,
         ga.total_quantity, COALESCE(ga.reserved_quantity, 0) AS reserved_quantity,
         COALESCE(ga.issued_quantity, 0) AS issued_quantity, COALESCE(ga.low_stock_threshold, 3) AS low_stock_threshold
  FROM gift_catalogue g LEFT JOIN gift_availability ga ON ga.gift_id = g.id
  WHERE g.status = 'active' AND g.is_visible = 1`

export async function getGifts(): Promise<Gift[]> {
  const rows = await query<GiftRow>(`${GIFT_SELECT} ORDER BY g.display_order, g.required_points`)
  return rows.map(toGift)
}

export async function getGift(code: string): Promise<Gift | null> {
  const row = await queryOne<GiftRow>(`${GIFT_SELECT} AND g.gift_code = ?`, [code])
  return row ? toGift(row) : null
}

export type ClaimResult = { ok: true; claim: RewardClaim } | { ok: false; reason: string }

export async function claimGift(contractorId: number, giftCode: string, idempotencyKey: string): Promise<ClaimResult> {
  const prior = await queryOne<{ contractor_id: number }>('SELECT contractor_id FROM redemption_requests WHERE idempotency_key = ?', [
    idempotencyKey,
  ])
  if (prior) {
    if (prior.contractor_id !== contractorId) return { ok: false, reason: 'Invalid request.' }
    const claims = await getContractorClaims(contractorId)
    return { ok: true, claim: claims[0] }
  }

  try {
    return await withTransaction(async (conn) => {
      const gift = await queryOne<GiftRow & { id: number }>(
        `SELECT g.id, g.gift_code, g.name, g.description, g.image_url, g.required_points, g.redemption_enabled,
                ga.total_quantity, ga.reserved_quantity, ga.issued_quantity, ga.low_stock_threshold
         FROM gift_catalogue g JOIN gift_availability ga ON ga.gift_id = g.id
         WHERE g.gift_code = ? AND g.status = 'active' AND g.is_visible = 1 FOR UPDATE`,
        [giftCode],
        conn,
      )
      if (!gift) return { ok: false as const, reason: 'This gift is no longer available.' }
      if (giftAvailability(gift) === 'out-of-stock') return { ok: false as const, reason: 'This gift is currently out of stock.' }

      const result = await execute(
        `INSERT INTO redemption_requests (contractor_id, gift_id, gift_name, required_points, required_tokens, status, idempotency_key)
         VALUES (?, ?, ?, ?, 0, 'requested', ?)`,
        [contractorId, gift.id, gift.name, gift.required_points, idempotencyKey],
        conn,
      )
      const claimCode = padCode('CLM-', result.insertId, 5)
      await execute('UPDATE redemption_requests SET claim_code = ? WHERE id = ?', [claimCode, result.insertId], conn)

      await postLedgerEntry(conn, {
        contractorId,
        entryType: 'reserve',
        amount: Number(gift.required_points),
        idempotencyKey: `reserve:${idempotencyKey}`,
        reason: `Reserved for ${gift.name} (${claimCode})`,
        redemptionId: result.insertId,
        actorType: 'contractor',
        actorId: contractorId,
      })
      await execute('UPDATE gift_availability SET reserved_quantity = reserved_quantity + 1 WHERE gift_id = ?', [gift.id], conn)
      await execute(
        `INSERT INTO redemption_status_history (redemption_id, from_status, to_status, actor_type, actor_id)
         VALUES (?, NULL, 'requested', 'contractor', ?)`,
        [result.insertId, contractorId],
        conn,
      )
      await writeAudit(
        {
          actorType: 'contractor',
          actorId: contractorId,
          action: 'redemption.requested',
          entityType: 'redemption',
          entityId: result.insertId,
          summary: `${claimCode}: ${gift.name} for ${gift.required_points} pts`,
        },
        conn,
      )
      return {
        ok: true as const,
        claim: {
          id: claimCode,
          giftId: gift.gift_code,
          giftName: gift.name,
          points: Number(gift.required_points),
          requestedOn: new Date().toISOString().slice(0, 10),
          status: 'requested' as const,
        },
      }
    })
  } catch (error) {
    if (error instanceof InsufficientBalanceError) return { ok: false, reason: 'Insufficient reward balance.' }
    if (isDuplicateKeyError(error) && String((error as Error).message).includes('uq_redemption_active')) {
      return { ok: false, reason: 'You already have a pending request for this gift.' }
    }
    throw error
  }
}

export async function getSales(contractorId: number): Promise<SaleRecord[]> {
  const rows = await query<{
    activity_code: string | null
    id: number
    reference_number: string
    customer_name: string | null
    activity_date: string
    product_ref: string | null
    product_category: string | null
    brand: string | null
    quantity: number
    unit: string | null
    notes: string | null
    eligible_amount: number
    manual_points: number | null
    status: string
    reward: number
  }>(
    `SELECT a.id, a.activity_code, a.reference_number, a.customer_name, a.activity_date, a.product_ref, a.product_category,
            a.brand, a.quantity, a.unit, a.notes, a.eligible_amount, a.manual_points, a.status,
            COALESCE((SELECT SUM(t.amount) FROM reward_transactions t
                      WHERE t.activity_id = a.id AND t.entry_type IN ('earn','earn_pending')), 0) AS reward
     FROM reward_activities a
     WHERE a.contractor_id = ? AND a.status IN ('submitted','approved','rejected','reversed')
     ORDER BY a.activity_date DESC, a.id DESC LIMIT 200`,
    [contractorId],
  )
  const returns = rows.length
    ? await query<{ id: number; activity_id: number; quantity: number; amount: number; points: number; reason: string; created_at: string }>(
        `SELECT id, activity_id, quantity, amount, points, reason, created_at FROM sale_returns
         WHERE activity_id IN (${rows.map(() => '?').join(',')}) ORDER BY id`,
        rows.map((r) => r.id),
      )
    : []
  // "per 20 kg bag" reads as "5 × 20 kg bag" after a quantity.
  const fmtQty = (q: number, unit: string | null) => `${q.toLocaleString('en-IN')}${unit ? ` × ${unit.replace(/^per\s+/i, '')}` : ''}`

  const records: SaleRecord[] = []
  for (const r of rows) {
    const own = returns.filter((x) => x.activity_id === r.id)
    const returnedQty = own.reduce((n, x) => n + Number(x.quantity), 0)
    const returnedAmount = own.reduce((n, x) => n + Number(x.amount), 0)
    const returnedPoints = own.reduce((n, x) => n + Number(x.points), 0)
    const product = [r.brand, r.product_ref ?? r.product_category].filter(Boolean).join(' ') || '-'
    const netQty = Number(r.quantity) - returnedQty
    records.push({
      id: r.activity_code ?? String(r.id),
      reference: r.reference_number,
      customer: r.customer_name ?? '-',
      date: toDate(r.activity_date),
      product,
      description: r.notes ?? undefined,
      quantity: netQty > 0 ? fmtQty(netQty, r.unit) : undefined,
      // Returned material is shown separately (as rejected), so the sale keeps only what was kept.
      amount: Math.max(0, Number(r.eligible_amount) - returnedAmount),
      // Reversed (cancelled) sales count as rejected; their points were taken back.
      status: r.status === 'approved' ? 'approved' : r.status === 'rejected' || r.status === 'reversed' ? 'rejected' : 'pending',
      reward:
        r.status === 'submitted' && r.manual_points !== null
          ? Number(r.manual_points)
          : r.status === 'reversed'
            ? 0
            : Math.max(0, Number(r.reward) - returnedPoints),
    })
    for (const [i, x] of own.entries()) {
      records.push({
        id: `${r.activity_code ?? r.id}-R${i + 1}`,
        reference: r.reference_number,
        customer: r.customer_name ?? '-',
        date: toDate(x.created_at),
        product: `Returned: ${product}`,
        description: x.reason,
        quantity: Number(x.quantity) > 0 ? fmtQty(Number(x.quantity), r.unit) : undefined,
        amount: Number(x.amount),
        status: 'rejected',
        reward: -Number(x.points),
        isReturn: true,
      })
    }
  }
  return records.sort((a, b) => b.date.localeCompare(a.date))
}

function periodRange(period: PerformancePeriod, from?: string, to?: string): [string, string] {
  const now = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const today = iso(now)
  switch (period) {
    case 'today':
      return [today, today]
    case 'week': {
      const d = new Date(now)
      d.setUTCDate(d.getUTCDate() - 6)
      return [iso(d), today]
    }
    case 'month':
      return [iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))), today]
    case 'last-month':
      return [
        iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))),
        iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))),
      ]
    case 'custom':
      return [from ?? today, to ?? today]
  }
}

export async function getPerformance(
  contractorId: number,
  period: PerformancePeriod,
  from?: string,
  to?: string,
): Promise<PerformanceMetrics> {
  const [start, end] = periodRange(period, from, to)
  const [sales, rewards] = await Promise.all([
    queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(a.eligible_amount - COALESCE((SELECT SUM(r.amount) FROM sale_returns r WHERE r.activity_id = a.id), 0)), 0) AS total
       FROM reward_activities a
       WHERE a.contractor_id = ? AND a.status = 'approved' AND a.activity_date BETWEEN ? AND ?`,
      [contractorId, start, end],
    ),
    queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(CASE WHEN entry_type = 'reversal' THEN -amount ELSE amount END), 0) AS total FROM reward_transactions
       WHERE contractor_id = ? AND currency = 'points' AND entry_type IN ('earn','manual_credit','pending_confirm','reversal')
         AND created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)`,
      [contractorId, start, end],
    ),
  ])
  return { salesBrought: Number(sales?.total ?? 0), rewardsEarned: Number(rewards?.total ?? 0) }
}

export async function getProductCatalogue(): Promise<{ categories: ProductCategory[]; products: Product[] }> {
  const [categories, products] = await Promise.all([
    query<{ slug: string; name: string; image_url: string | null }>(
      "SELECT slug, name, image_url FROM product_categories WHERE status = 'active' ORDER BY display_order, name",
    ),
    query<{ id: number; slug: string; name: string; brand: string | null; unit: string | null; scheme_label: string | null; image_url: string | null; description: string | null; reward_points: number | null; texture_url: string | null; tile_width_mm: number | null; tile_height_mm: number | null }>(
      `SELECT p.id, c.slug, p.name, p.brand, p.unit, p.scheme_label, p.image_url, p.description, p.reward_points, p.texture_url, p.tile_width_mm, p.tile_height_mm
       FROM products p JOIN product_categories c ON c.id = p.category_id
       WHERE p.status = 'active' AND c.status = 'active' ORDER BY c.display_order, p.display_order, p.name`,
    ),
  ])
  return {
    categories: categories.map((c) => ({ id: c.slug, name: c.name, image: c.image_url ?? '/placeholder.svg' })),
    products: products.map((p) => ({
      id: String(p.id),
      name: p.name,
      brand: p.brand ?? '',
      unit: p.unit ?? '',
      category: p.slug,
      scheme: p.scheme_label ?? undefined,
      image: p.image_url ?? undefined,
      description: p.description ?? undefined,
      points: p.reward_points ? Number(p.reward_points) : undefined,
      texture: p.texture_url ?? undefined,
      tileSizeMm:
        p.tile_width_mm && p.tile_height_mm ? { width: Number(p.tile_width_mm), height: Number(p.tile_height_mm) } : undefined,
    })),
  }
}

/** A contractor's progress towards an offer target, counted only within the offer's own dates. */
async function offerProgress(contractorId: number, unit: OfferTargetUnit, start: string, end: string): Promise<number> {
  if (unit === 'amount' || unit === 'quantity') {
    const [column, returned] = unit === 'amount' ? ['eligible_amount', 'amount'] : ['quantity', 'quantity']
    const row = await queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(a.${column} - COALESCE((SELECT SUM(r.${returned}) FROM sale_returns r WHERE r.activity_id = a.id), 0)), 0) AS total
       FROM reward_activities a
       WHERE a.contractor_id = ? AND a.status = 'approved' AND a.activity_date BETWEEN ? AND ?`,
      [contractorId, start, end],
    )
    return Number(row?.total ?? 0)
  }
  const row = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(CASE WHEN entry_type = 'reversal' THEN -amount ELSE amount END), 0) AS total FROM reward_transactions
     WHERE contractor_id = ? AND currency = ? AND entry_type IN ('earn','manual_credit','reversal')
       AND created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)`,
    [contractorId, unit, start, end],
  )
  return Number(row?.total ?? 0)
}

export async function getOffersAndTargets(contractorId: number): Promise<{ offers: Offer[]; targets: SchemeTarget[] }> {
  const [offers, targets] = await Promise.all([
    query<{
      id: number
      title: string
      description: string | null
      start_date: string
      end_date: string
      multiplier: number | null
      reward_type: Offer['rewardType']
      reward_value: number | null
      target_value: number | null
      target_unit: OfferTargetUnit | null
      show_progress: number
      is_featured: number
      banner_url: string | null
      terms: string | null
    }>(
      `SELECT o.id, o.title, o.description, o.start_date, o.end_date, o.multiplier, o.reward_type, o.reward_value,
              o.target_value, o.target_unit, o.show_progress, o.is_featured, o.banner_url, o.terms
       FROM offers o
       WHERE o.status = 'published' AND o.end_date >= UTC_DATE()
         AND (o.audience = 'all' OR EXISTS (SELECT 1 FROM offer_contractors oc WHERE oc.offer_id = o.id AND oc.contractor_id = ?))
       ORDER BY o.is_featured DESC, o.end_date ASC LIMIT 50`,
      [contractorId],
    ),
    query<{ id: number; title: string; current_value: number; target_value: number; unit: string }>(
      `SELECT id, title, current_value, target_value, unit FROM contractor_targets
       WHERE contractor_id = ? AND status = 'in_progress' ORDER BY id DESC`,
      [contractorId],
    ),
  ])
  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const progress = await Promise.all(
    offers.map((o) =>
      o.target_value && o.target_unit && o.show_progress
        ? offerProgress(contractorId, o.target_unit, toDate(o.start_date), toDate(o.end_date))
        : Promise.resolve(undefined),
    ),
  )
  return {
    offers: offers.map((o, i) => {
      const multiplier = o.multiplier ? Number(o.multiplier) : o.reward_type === 'multiplier' && o.reward_value ? Number(o.reward_value) : undefined
      return {
        id: String(o.id),
        title: o.title,
        description: o.description ?? '',
        state: toDate(o.start_date) > today ? 'upcoming' : toDate(o.end_date) <= soon ? 'expiring' : 'active',
        startDate: toDate(o.start_date),
        validTill: toDate(o.end_date),
        multiplier,
        rewardType: o.reward_type,
        rewardValue: o.reward_value ? Number(o.reward_value) : undefined,
        bannerUrl: o.banner_url ?? undefined,
        terms: o.terms ?? undefined,
        featured: Boolean(Number(o.is_featured)),
        target:
          o.target_value && o.target_unit
            ? { value: Number(o.target_value), unit: o.target_unit, current: progress[i] }
            : undefined,
      }
    }),
    targets: targets.map((t) => ({
      id: String(t.id),
      title: t.title,
      current: Number(t.current_value),
      target: Number(t.target_value),
      unit: t.unit === 'amount' ? '₹' : t.unit,
    })),
  }
}

function relativeTime(value: string) {
  const diff = Date.now() - new Date(`${value.replace(' ', 'T')}Z`).getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  return value.slice(0, 10)
}

export async function getNotifications(contractorId: number): Promise<{ items: AppNotification[]; readIds: string[] }> {
  const rows = await query<{ id: number; kind: AppNotification['kind']; title: string; body: string; created_at: string; read_at: string | null }>(
    `SELECT n.id, n.kind, n.title, n.body, nr.created_at, nr.read_at
     FROM notification_recipients nr JOIN notifications n ON n.id = nr.notification_id
     WHERE nr.contractor_id = ? ORDER BY nr.id DESC LIMIT 100`,
    [contractorId],
  )
  return {
    items: rows.map((r) => ({ id: String(r.id), kind: r.kind, title: r.title, body: r.body, time: relativeTime(r.created_at) })),
    readIds: rows.filter((r) => r.read_at).map((r) => String(r.id)),
  }
}

export async function markNotificationsRead(contractorId: number) {
  await execute('UPDATE notification_recipients SET read_at = UTC_TIMESTAMP() WHERE contractor_id = ? AND read_at IS NULL', [contractorId])
}

export async function setNotificationPreference(contractorId: number, key: keyof NotificationPreferences, value: boolean) {
  const column = ({ rewards: 'rewards', sales: 'sales', offers: 'offers', sms: 'sms' } as const)[key]
  if (!column) throw new Error('Invalid preference')
  await execute(
    `INSERT INTO contractor_notification_preferences (contractor_id, ${column}) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE ${column} = VALUES(${column})`,
    [contractorId, value ? 1 : 0],
  )
}
