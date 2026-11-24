import type { PoolConnection } from 'mysql2/promise'
import { z } from 'zod'
import { execute, isDuplicateKeyError, padCode, query, queryOne, withTransaction } from './db'
import { writeAudit } from './audit'
import { InsufficientBalanceError, postLedgerEntry } from './ledger'
import type { AdminSession } from './auth'

export const RULE_TYPES = [
  { value: 'quantity', label: 'Quantity based' },
  { value: 'purchase_value', label: 'Purchase value based' },
  { value: 'brand', label: 'Brand based' },
  { value: 'product', label: 'Product based' },
  { value: 'category', label: 'Category based' },
  { value: 'cumulative_target', label: 'Cumulative target' },
  { value: 'milestone', label: 'Milestone reward' },
  { value: 'campaign', label: 'Time-bound campaign' },
  { value: 'direct_gift', label: 'Direct gift assignment' },
  { value: 'manual_bonus', label: 'Manual bonus' },
] as const

export type RuleType = (typeof RULE_TYPES)[number]['value']

const optionalNumber = z.preprocess((v) => (v === '' || v === null || v === undefined ? null : Number(v)), z.number().min(0).nullable())
const optionalString = (max: number) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : null), z.string().max(max).nullable())
const optionalDate = z.preprocess(
  (v) => (typeof v === 'string' && v ? v : null),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
)
const checkbox = z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean())

export const ruleSchema = z.object({
  name: z.string().trim().min(3, 'Rule name is required.').max(150),
  description: optionalString(2000),
  ruleType: z.enum(RULE_TYPES.map((r) => r.value) as [RuleType, ...RuleType[]]),
  productCategory: optionalString(80),
  brand: optionalString(80),
  productRef: optionalString(120),
  minQuantity: optionalNumber,
  minAmount: optionalNumber,
  unitSize: optionalNumber,
  rewardPoints: z.coerce.number().int().min(0).max(10_000_000),
  rewardTokens: z.coerce.number().int().min(0).max(10_000_000),
  targetThreshold: optionalNumber,
  contractorId: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().positive().nullable()),
  giftId: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().positive().nullable()),
  validFrom: optionalDate,
  validUntil: optionalDate,
  maxRewardCap: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().min(1).nullable()),
  isRepeatable: checkbox,
  isStackable: checkbox,
  priority: z.coerce.number().int().min(0).max(10000).default(100),
  status: z.enum(['draft', 'active', 'inactive']),
})

export type RuleInput = z.infer<typeof ruleSchema>

export interface RuleRow {
  id: number
  rule_code: string
  version: number
  name: string
  description: string | null
  rule_type: RuleType
  product_category: string | null
  brand: string | null
  product_ref: string | null
  min_quantity: number | null
  min_amount: number | null
  unit_size: number | null
  reward_points: number
  reward_tokens: number
  target_threshold: number | null
  gift_id: number | null
  contractor_id: number | null
  valid_from: string | null
  valid_until: string | null
  max_reward_cap: number | null
  is_repeatable: number
  is_stackable: number
  priority: number
  status: 'draft' | 'active' | 'inactive' | 'archived'
  created_at: string
}

export interface ActivityFacts {
  contractorId: number
  activityDate: string
  productCategory: string | null
  brand: string | null
  productRef: string | null
  quantity: number
  amount: number
}

const eq = (a: string | null, b: string | null) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase()

/** Pure reward calculation for one rule against one activity. `cumulative` = approved amount within the rule window including this activity; `priorAwards` = number of earlier awards from this rule to this contractor. */
export function computeRuleReward(
  rule: RuleRow,
  facts: ActivityFacts,
  context: { cumulative: number; priorAwards: number } = { cumulative: facts.amount, priorAwards: 0 },
): { multiplier: number; points: number; tokens: number; explanation: string } {
  const none = (why: string) => ({ multiplier: 0, points: 0, tokens: 0, explanation: why })
  if (rule.rule_type === 'direct_gift' || rule.rule_type === 'manual_bonus') return none('Applied manually by an admin.')
  if (rule.contractor_id && rule.contractor_id !== facts.contractorId) return none('Rule is for a different contractor.')
  if (rule.valid_from && facts.activityDate < rule.valid_from.slice(0, 10)) return none('Activity is before the rule start date.')
  if (rule.valid_until && facts.activityDate > rule.valid_until.slice(0, 10)) return none('Activity is after the rule end date.')
  if (rule.product_category && !eq(rule.product_category, facts.productCategory)) return none('Product category does not match.')
  if (rule.brand && !eq(rule.brand, facts.brand)) return none('Brand does not match.')
  if (rule.product_ref && !eq(rule.product_ref, facts.productRef)) return none('Product does not match.')
  if (rule.min_quantity && facts.quantity < Number(rule.min_quantity)) return none(`Quantity is below the minimum of ${rule.min_quantity}.`)
  if (rule.min_amount && facts.amount < Number(rule.min_amount)) return none(`Amount is below the minimum of ${rule.min_amount}.`)

  let multiplier = 0
  let explanation = ''
  const unit = Number(rule.unit_size ?? 0)

  if (rule.rule_type === 'cumulative_target' || rule.rule_type === 'milestone') {
    const threshold = Number(rule.target_threshold ?? 0)
    if (threshold <= 0) return none('Target threshold is not set.')
    const reached = Math.floor(context.cumulative / threshold)
    const allowed = rule.is_repeatable || rule.rule_type === 'milestone' ? reached : Math.min(reached, 1)
    multiplier = Math.max(0, allowed - context.priorAwards)
    explanation = multiplier
      ? `Cumulative ${context.cumulative.toLocaleString('en-IN')} crossed ${threshold.toLocaleString('en-IN')} (${multiplier}x).`
      : `Cumulative ${context.cumulative.toLocaleString('en-IN')} has not crossed the next ${threshold.toLocaleString('en-IN')}.`
  } else if (rule.rule_type === 'quantity') {
    multiplier = unit > 0 ? Math.floor(facts.quantity / unit) : 1
    explanation = unit > 0 ? `${facts.quantity} units / ${unit} per reward = ${multiplier}x.` : 'Quantity condition met.'
  } else {
    multiplier = unit > 0 ? Math.floor(facts.amount / unit) : 1
    explanation = unit > 0 ? `Amount ${facts.amount.toLocaleString('en-IN')} / ${unit.toLocaleString('en-IN')} = ${multiplier}x.` : 'Conditions met.'
  }
  if (!rule.is_repeatable && rule.rule_type !== 'milestone') multiplier = Math.min(multiplier, 1)
  let points = multiplier * Number(rule.reward_points)
  let tokens = multiplier * Number(rule.reward_tokens)
  if (rule.max_reward_cap) {
    points = Math.min(points, Number(rule.max_reward_cap))
    tokens = Math.min(tokens, Number(rule.max_reward_cap))
  }
  return { multiplier, points, tokens, explanation }
}

async function ruleContext(conn: PoolConnection | undefined, rule: RuleRow, facts: ActivityFacts, excludeActivityId?: number) {
  if (rule.rule_type !== 'cumulative_target' && rule.rule_type !== 'milestone') return { cumulative: facts.amount, priorAwards: 0 }
  const totals = await queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(eligible_amount), 0) AS total FROM reward_activities
     WHERE contractor_id = ? AND status = 'approved' ${excludeActivityId ? 'AND id <> ?' : ''}
       AND (? IS NULL OR activity_date >= ?) AND (? IS NULL OR activity_date <= ?)`,
    [
      facts.contractorId,
      ...(excludeActivityId ? [excludeActivityId] : []),
      rule.valid_from,
      rule.valid_from,
      rule.valid_until,
      rule.valid_until,
    ],
    conn,
  )
  const prior = await queryOne<{ n: number }>(
    `SELECT COUNT(DISTINCT activity_id) AS n FROM reward_transactions
     WHERE contractor_id = ? AND rule_id = ? AND entry_type = 'earn'
       AND activity_id NOT IN (SELECT reverses.activity_id FROM (SELECT activity_id FROM reward_transactions WHERE rule_id = ? AND entry_type = 'reversal' AND activity_id IS NOT NULL) reverses)`,
    [facts.contractorId, rule.id, rule.id],
    conn,
  )
  return { cumulative: Number(totals?.total ?? 0) + facts.amount, priorAwards: Number(prior?.n ?? 0) }
}

async function activeRules(conn?: PoolConnection) {
  return query<RuleRow>(
    `SELECT * FROM reward_rules WHERE status = 'active' AND rule_type NOT IN ('direct_gift','manual_bonus')
     ORDER BY priority ASC, id ASC`,
    [],
    conn,
  )
}

export interface RuleEvaluation {
  ruleId: number
  ruleName: string
  points: number
  tokens: number
  explanation: string
  applied: boolean
}

export async function evaluateRules(facts: ActivityFacts, conn?: PoolConnection, excludeActivityId?: number): Promise<RuleEvaluation[]> {
  const rules = await activeRules(conn)
  const results: RuleEvaluation[] = []
  let exclusiveTaken = false
  for (const rule of rules) {
    const ctx = await ruleContext(conn, rule, facts, excludeActivityId)
    const r = computeRuleReward(rule, facts, ctx)
    const earns = r.points > 0 || r.tokens > 0
    let applied = earns
    let explanation = r.explanation
    if (earns && !rule.is_stackable) {
      if (exclusiveTaken) {
        applied = false
        explanation = 'Skipped: a higher-priority non-stackable rule already applied.'
      } else exclusiveTaken = true
    }
    results.push({ ruleId: rule.id, ruleName: rule.name, points: r.points, tokens: r.tokens, explanation, applied })
  }
  return results
}

function ruleValues(input: RuleInput) {
  return [
    input.name,
    input.description,
    input.ruleType,
    input.productCategory,
    input.brand,
    input.productRef,
    input.minQuantity,
    input.minAmount,
    input.unitSize,
    input.rewardPoints,
    input.rewardTokens,
    input.targetThreshold,
    input.giftId,
    input.contractorId,
    input.validFrom,
    input.validUntil,
    input.maxRewardCap,
    input.isRepeatable ? 1 : 0,
    input.isStackable ? 1 : 0,
    input.priority,
    input.status,
  ]
}

const RULE_COLUMNS = `name, description, rule_type, product_category, brand, product_ref, min_quantity, min_amount, unit_size,
  reward_points, reward_tokens, target_threshold, gift_id, contractor_id, valid_from, valid_until, max_reward_cap,
  is_repeatable, is_stackable, priority, status`

export async function createRule(admin: AdminSession, input: RuleInput) {
  if (input.validFrom && input.validUntil && input.validFrom > input.validUntil) {
    return { ok: false as const, error: 'End date must be after the start date.' }
  }
  return withTransaction(async (conn) => {
    const r = await execute(
      `INSERT INTO reward_rules (rule_code, version, ${RULE_COLUMNS}, requires_approval, created_by_admin_id)
       VALUES (?, 1, ${Array(21).fill('?').join(', ')}, 1, ?)`,
      [`TMP-${Date.now()}-${Math.random()}`.slice(0, 40), ...ruleValues(input), admin.adminId],
      conn,
    )
    const code = padCode('RULE-', r.insertId, 4)
    await execute('UPDATE reward_rules SET rule_code = ? WHERE id = ?', [code, r.insertId], conn)
    await writeAudit(
      { actorType: 'admin', actorId: admin.adminId, action: 'rule.created', entityType: 'reward_rule', entityId: r.insertId, summary: `${code} ${input.name}` },
      conn,
    )
    return { ok: true as const }
  })
}

/** Rules already used by the ledger are never edited in place: a new version is created and the old one archived. */
export async function updateRule(admin: AdminSession, ruleId: number, input: RuleInput) {
  if (input.validFrom && input.validUntil && input.validFrom > input.validUntil) {
    return { ok: false as const, error: 'End date must be after the start date.' }
  }
  return withTransaction(async (conn) => {
    const rule = await queryOne<RuleRow>('SELECT * FROM reward_rules WHERE id = ? FOR UPDATE', [ruleId], conn)
    if (!rule || rule.status === 'archived') return { ok: false as const, error: 'Rule not found or archived.' }
    const used = await queryOne('SELECT 1 FROM reward_transactions WHERE rule_id = ? LIMIT 1', [ruleId], conn)
    if (!used) {
      await execute(
        `UPDATE reward_rules SET ${RULE_COLUMNS.split(',').map((c) => `${c.trim()} = ?`).join(', ')} WHERE id = ?`,
        [...ruleValues(input), ruleId],
        conn,
      )
      await writeAudit(
        { actorType: 'admin', actorId: admin.adminId, action: 'rule.updated', entityType: 'reward_rule', entityId: ruleId, summary: `${rule.rule_code} edited` },
        conn,
      )
      return { ok: true as const }
    }
    const max = await queryOne<{ v: number }>('SELECT MAX(version) AS v FROM reward_rules WHERE rule_code = ?', [rule.rule_code], conn)
    const r = await execute(
      `INSERT INTO reward_rules (rule_code, version, parent_rule_id, ${RULE_COLUMNS}, requires_approval, created_by_admin_id)
       VALUES (?, ?, ?, ${Array(21).fill('?').join(', ')}, 1, ?)`,
      [rule.rule_code, Number(max?.v ?? rule.version) + 1, ruleId, ...ruleValues(input), admin.adminId],
      conn,
    )
    await execute("UPDATE reward_rules SET status = 'archived' WHERE id = ?", [ruleId], conn)
    await writeAudit(
      {
        actorType: 'admin',
        actorId: admin.adminId,
        action: 'rule.versioned',
        entityType: 'reward_rule',
        entityId: r.insertId,
        summary: `${rule.rule_code} v${Number(max?.v ?? rule.version) + 1} replaces v${rule.version}`,
      },
      conn,
    )
    return { ok: true as const }
  })
}

export async function setRuleStatus(admin: AdminSession, ruleId: number, status: 'active' | 'inactive' | 'archived') {
  const r = await execute("UPDATE reward_rules SET status = ? WHERE id = ? AND status <> 'archived'", [status, ruleId])
  if (!r.affectedRows) return { ok: false as const, error: 'Rule not found or already archived.' }
  await writeAudit({ actorType: 'admin', actorId: admin.adminId, action: `rule.${status}`, entityType: 'reward_rule', entityId: ruleId })
  return { ok: true as const }
}

export async function listRules(includeArchived = false) {
  return query<RuleRow & { gift_name: string | null; contractor_name: string | null; times_applied: number }>(
    `SELECT r.*, g.name AS gift_name, c.name AS contractor_name,
            (SELECT COUNT(*) FROM reward_transactions t WHERE t.rule_id = r.id AND t.entry_type = 'earn') AS times_applied
     FROM reward_rules r
     LEFT JOIN gift_catalogue g ON g.id = r.gift_id
     LEFT JOIN contractors c ON c.id = r.contractor_id
     ${includeArchived ? '' : "WHERE r.status <> 'archived'"}
     ORDER BY FIELD(r.status, 'active', 'draft', 'inactive', 'archived'), r.priority, r.id DESC`,
  )
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

export const activitySchema = z.object({
  contractorId: z.coerce.number().int().positive('Select a contractor.'),
  customerName: optionalString(150),
  referenceNumber: z.string().trim().min(1, 'Invoice / reference number is required.').max(80),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a date.'),
  productCategory: optionalString(80),
  brand: optionalString(80),
  productRef: optionalString(150),
  quantity: z.coerce.number().min(0).max(10_000_000),
  unit: optionalString(30),
  eligibleAmount: z.coerce.number().min(0, 'Amount cannot be negative.').max(1_000_000_000),
  /** Blank = calculate with the active reward rules on approval. */
  manualPoints: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().int('Whole points only.').min(0, 'Points cannot be negative.').max(10_000_000).nullable(),
  ),
  notes: optionalString(2000),
})

export type ActivityInput = z.infer<typeof activitySchema>

async function notify(
  conn: PoolConnection,
  contractorId: number,
  kind: 'reward' | 'sale' | 'offer' | 'system',
  eventType: string,
  title: string,
  body: string,
  adminId: number | null,
) {
  const n = await execute(
    `INSERT INTO notifications (kind, event_type, title, body, created_by_type, created_by_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [kind, eventType, title.slice(0, 150), body.slice(0, 500), adminId ? 'admin' : 'system', adminId],
    conn,
  )
  await execute('INSERT INTO notification_recipients (notification_id, contractor_id) VALUES (?, ?)', [n.insertId, contractorId], conn)
}

export { notify as notifyContractor }

async function approveWithinTransaction(conn: PoolConnection, admin: AdminSession, activityId: number, opts: { silent?: boolean } = {}) {
  const a = await queryOne<{
    id: number
    activity_code: string
    contractor_id: number
    status: string
    activity_date: string
    product_category: string | null
    brand: string | null
    product_ref: string | null
    quantity: number
    eligible_amount: number
    manual_points: number | null
    reference_number: string
    account_status: string
  }>(
    `SELECT a.*, c.account_status FROM reward_activities a JOIN contractors c ON c.id = a.contractor_id WHERE a.id = ? FOR UPDATE`,
    [activityId],
    conn,
  )
  if (!a) return { ok: false as const, error: 'Activity not found.' }
  if (a.status !== 'submitted' && a.status !== 'draft') return { ok: false as const, error: `Activity is already ${a.status}.` }
  if (a.account_status !== 'active') return { ok: false as const, error: 'Contractor account is not active.' }

  const facts: ActivityFacts = {
    contractorId: a.contractor_id,
    activityDate: a.activity_date.slice(0, 10),
    productCategory: a.product_category,
    brand: a.brand,
    productRef: a.product_ref,
    quantity: Number(a.quantity),
    amount: Number(a.eligible_amount),
  }
  const manualPoints = a.manual_points === null ? null : Number(a.manual_points)
  // Admin-entered points replace rule calculation for this sale.
  const evaluations = manualPoints === null ? await evaluateRules(facts, conn, a.id) : []
  const general = await queryOne<{ id: number }>("SELECT id FROM token_categories WHERE code = 'general'", [], conn)
  let points = 0
  let tokens = 0
  if (manualPoints !== null && manualPoints > 0) {
    await postLedgerEntry(conn, {
      contractorId: a.contractor_id,
      entryType: 'earn',
      amount: manualPoints,
      idempotencyKey: `manual:act:${a.id}:points`,
      reason: `Sale ${a.reference_number}`,
      activityId: a.id,
      actorType: 'admin',
      actorId: admin.adminId,
    })
    points += manualPoints
  }
  for (const e of evaluations.filter((x) => x.applied)) {
    if (e.points > 0) {
      await postLedgerEntry(conn, {
        contractorId: a.contractor_id,
        entryType: 'earn',
        amount: e.points,
        idempotencyKey: `rule:${e.ruleId}:act:${a.id}:points`,
        reason: `${e.ruleName} - ${a.reference_number}`,
        activityId: a.id,
        ruleId: e.ruleId,
        actorType: 'admin',
        actorId: admin.adminId,
      })
      points += e.points
    }
    if (e.tokens > 0) {
      await postLedgerEntry(conn, {
        contractorId: a.contractor_id,
        currency: 'tokens',
        tokenCategoryId: general?.id ?? null,
        entryType: 'earn',
        amount: e.tokens,
        idempotencyKey: `rule:${e.ruleId}:act:${a.id}:tokens`,
        reason: `${e.ruleName} - ${a.reference_number}`,
        activityId: a.id,
        ruleId: e.ruleId,
        actorType: 'admin',
        actorId: admin.adminId,
      })
      tokens += e.tokens
    }
  }
  await execute(
    "UPDATE reward_activities SET status = 'approved', approved_by_admin_id = ?, approved_at = UTC_TIMESTAMP() WHERE id = ?",
    [admin.adminId, a.id],
    conn,
  )
  await writeAudit(
    {
      actorType: 'admin',
      actorId: admin.adminId,
      action: 'activity.approved',
      entityType: 'reward_activity',
      entityId: a.id,
      summary: `${a.activity_code} approved: +${points} pts, +${tokens} tokens`,
      metadata: { evaluations },
    },
    conn,
  )
  if (!opts.silent) await notify(
    conn,
    a.contractor_id,
    'sale',
    'sale_approved',
    'Referred sale approved',
    points || tokens
      ? `Sale ${a.reference_number} was approved. You earned ${points.toLocaleString('en-IN')} points${tokens ? ` and ${tokens} tokens` : ''}.`
      : `Sale ${a.reference_number} was approved.`,
    admin.adminId,
  )
  return { ok: true as const, points, tokens }
}

async function insertActivity(conn: PoolConnection, admin: AdminSession, input: ActivityInput) {
      const r = await execute(
        `INSERT INTO reward_activities (contractor_id, customer_name, reference_number, activity_date, product_category, product_ref, brand,
           quantity, unit, eligible_amount, manual_points, notes, status, created_by_admin_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?)`,
        [
          input.contractorId,
          input.customerName,
          input.referenceNumber,
          input.activityDate,
          input.productCategory,
          input.productRef,
          input.brand,
          input.quantity,
          input.unit,
          input.eligibleAmount,
          input.manualPoints,
          input.notes,
          admin.adminId,
        ],
        conn,
      )
      await execute('UPDATE reward_activities SET activity_code = ? WHERE id = ?', [padCode('ACT-', r.insertId), r.insertId], conn)
      await writeAudit(
        { actorType: 'admin', actorId: admin.adminId, action: 'activity.created', entityType: 'reward_activity', entityId: r.insertId, summary: input.referenceNumber },
        conn,
      )
      return r.insertId
}

/**
 * Records and approves a sale inside the caller's transaction (used when a cart request is
 * completed). Throws on failure so the whole caller transaction rolls back.
 */
export async function recordApprovedSale(conn: PoolConnection, admin: AdminSession, input: ActivityInput) {
  const id = await insertActivity(conn, admin, input)
  const result = await approveWithinTransaction(conn, admin, id, { silent: true })
  if (!result.ok) throw new SaleError(result.error)
  return { id, points: result.points, tokens: result.tokens }
}

/** A sale could not be recorded; the message is safe to show to the admin. */
export class SaleError extends Error {}

export async function createActivity(admin: AdminSession, input: ActivityInput, approveNow: boolean) {
  try {
    return await withTransaction(async (conn) => {
      const contractor = await queryOne<{ account_status: string }>('SELECT account_status FROM contractors WHERE id = ?', [input.contractorId], conn)
      if (!contractor) return { ok: false as const, error: 'Contractor not found.' }
      const insertId = await insertActivity(conn, admin, input)
      if (approveNow) return approveWithinTransaction(conn, admin, insertId)
      await notify(conn, input.contractorId, 'sale', 'sale_recorded', 'Referred sale recorded', `Sale ${input.referenceNumber} is recorded and pending approval.`, admin.adminId)
      return { ok: true as const }
    })
  } catch (error) {
    if (isDuplicateKeyError(error)) return { ok: false as const, error: 'This invoice / reference number is already recorded for this contractor.' }
    throw error
  }
}

export async function approveActivity(admin: AdminSession, activityId: number) {
  return withTransaction((conn) => approveWithinTransaction(conn, admin, activityId))
}

export async function rejectActivity(admin: AdminSession, activityId: number, reason: string) {
  return withTransaction(async (conn) => {
    const a = await queryOne<{ status: string; contractor_id: number; reference_number: string }>(
      'SELECT status, contractor_id, reference_number FROM reward_activities WHERE id = ? FOR UPDATE',
      [activityId],
      conn,
    )
    if (!a) return { ok: false as const, error: 'Activity not found.' }
    if (a.status !== 'submitted' && a.status !== 'draft') return { ok: false as const, error: `Activity is already ${a.status}.` }
    await execute("UPDATE reward_activities SET status = 'rejected', rejection_reason = ? WHERE id = ?", [reason, activityId], conn)
    await writeAudit({ actorType: 'admin', actorId: admin.adminId, action: 'activity.rejected', entityType: 'reward_activity', entityId: activityId, summary: reason }, conn)
    await notify(conn, a.contractor_id, 'sale', 'sale_rejected', 'Referred sale rejected', `Sale ${a.reference_number} was not approved: ${reason}`, admin.adminId)
    return { ok: true as const }
  })
}

/** Reverses an approved activity by posting reversal entries; the original ledger rows are never modified. */
export async function reverseActivity(admin: AdminSession, activityId: number, reason: string) {
  try {
    return await withTransaction(async (conn) => {
      const a = await queryOne<{ status: string; contractor_id: number; reference_number: string }>(
        'SELECT status, contractor_id, reference_number FROM reward_activities WHERE id = ? FOR UPDATE',
        [activityId],
        conn,
      )
      if (!a) return { ok: false as const, error: 'Activity not found.' }
      if (a.status !== 'approved') return { ok: false as const, error: 'Only approved activities can be reversed.' }
      // Reverse what is still credited: earned minus anything already taken back by partial returns.
      const groups = await query<{ currency: 'points' | 'tokens'; token_category_id: number | null; earned: number }>(
        `SELECT currency, token_category_id, SUM(amount) AS earned FROM reward_transactions
         WHERE activity_id = ? AND entry_type = 'earn' GROUP BY currency, token_category_id`,
        [activityId],
        conn,
      )
      const returned = await queryOne<{ points: number; tokens: number }>(
        'SELECT COALESCE(SUM(points), 0) AS points, COALESCE(SUM(tokens), 0) AS tokens FROM sale_returns WHERE activity_id = ?',
        [activityId],
        conn,
      )
      let pointsLeftToSubtract = Number(returned?.points ?? 0)
      let tokensLeftToSubtract = Number(returned?.tokens ?? 0)
      for (const g of groups) {
        const already = g.currency === 'points' ? pointsLeftToSubtract : tokensLeftToSubtract
        const take = Math.min(Number(g.earned), already)
        if (g.currency === 'points') pointsLeftToSubtract -= take
        else tokensLeftToSubtract -= take
        const remaining = Number(g.earned) - take
        if (remaining <= 0) continue
        await postLedgerEntry(conn, {
          contractorId: a.contractor_id,
          currency: g.currency,
          tokenCategoryId: g.token_category_id,
          entryType: 'reversal',
          amount: remaining,
          idempotencyKey: `reverse:act:${activityId}:${g.currency}:${g.token_category_id ?? 0}`,
          reason: `Reversal - ${a.reference_number}: ${reason}`,
          activityId,
          actorType: 'admin',
          actorId: admin.adminId,
        })
      }
      await execute("UPDATE reward_activities SET status = 'reversed', rejection_reason = ? WHERE id = ?", [reason, activityId], conn)
      await writeAudit({ actorType: 'admin', actorId: admin.adminId, action: 'activity.reversed', entityType: 'reward_activity', entityId: activityId, summary: reason }, conn)
      await notify(conn, a.contractor_id, 'reward', 'reward_reversed', 'Reward reversed', `Rewards for sale ${a.reference_number} were reversed: ${reason}`, admin.adminId)
      return { ok: true as const }
    })
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return { ok: false as const, error: 'Contractor has already used these points. Debit the balance manually or cancel the open redemption first.' }
    }
    throw error
  }
}

export interface ActivityListRow {
  id: number
  activity_code: string
  contractor_id: number
  contractor_name: string
  contractor_code: string
  customer_name: string | null
  reference_number: string
  activity_date: string
  product_category: string | null
  brand: string | null
  product_ref: string | null
  quantity: number
  eligible_amount: number
  manual_points: number | null
  notes: string | null
  unit: string | null
  status: string
  rejection_reason: string | null
  points: number
  tokens: number
  returned_quantity: number
  returned_amount: number
  returned_points: number
}

export async function listActivities(filters: { status?: string; q?: string; contractorId?: number }) {
  const where = ['1=1']
  const params: unknown[] = []
  if (filters.status && ['submitted', 'approved', 'rejected', 'reversed'].includes(filters.status)) {
    where.push('a.status = ?')
    params.push(filters.status)
  }
  if (filters.contractorId) {
    where.push('a.contractor_id = ?')
    params.push(filters.contractorId)
  }
  if (filters.q) {
    const like = `%${filters.q.replace(/[%_\\]/g, '\\$&')}%`
    where.push('(a.reference_number LIKE ? OR c.name LIKE ? OR c.mobile LIKE ? OR a.customer_name LIKE ?)')
    params.push(like, like, like, like)
  }
  return query<ActivityListRow>(
    `SELECT a.id, a.activity_code, a.contractor_id, c.name AS contractor_name, c.contractor_code, a.customer_name, a.reference_number,
            a.activity_date, a.product_category, a.brand, a.product_ref, a.quantity, a.eligible_amount, a.manual_points, a.notes, a.unit, a.status, a.rejection_reason,
            COALESCE((SELECT SUM(r.quantity) FROM sale_returns r WHERE r.activity_id = a.id), 0) AS returned_quantity,
            COALESCE((SELECT SUM(r.amount) FROM sale_returns r WHERE r.activity_id = a.id), 0) AS returned_amount,
            COALESCE((SELECT SUM(r.points) FROM sale_returns r WHERE r.activity_id = a.id), 0) AS returned_points,
            COALESCE((SELECT SUM(t.amount) FROM reward_transactions t WHERE t.activity_id = a.id AND t.entry_type = 'earn' AND t.currency = 'points'), 0) AS points,
            COALESCE((SELECT SUM(t.amount) FROM reward_transactions t WHERE t.activity_id = a.id AND t.entry_type = 'earn' AND t.currency = 'tokens'), 0) AS tokens
     FROM reward_activities a JOIN contractors c ON c.id = a.contractor_id
     WHERE ${where.join(' AND ')}
     ORDER BY FIELD(a.status, 'submitted', 'approved', 'rejected', 'reversed'), a.activity_date DESC, a.id DESC
     LIMIT 200`,
    params,
  )
}

// ---------------------------------------------------------------------------
// Editing sales and recording returns
// ---------------------------------------------------------------------------

/**
 * Edits a sale. Pending sales can change everything; approved sales only change descriptive
 * details, because quantity, amount and points changes after approval go through returns.
 */
export async function updateActivity(admin: AdminSession, activityId: number, input: ActivityInput) {
  try {
    return await withTransaction(async (conn) => {
      const a = await queryOne<{ status: string; contractor_id: number }>('SELECT status, contractor_id FROM reward_activities WHERE id = ? FOR UPDATE', [activityId], conn)
      if (!a) return { ok: false as const, error: 'Sale not found.' }
      if (a.status === 'submitted' || a.status === 'draft') {
        await execute(
          `UPDATE reward_activities SET customer_name = ?, reference_number = ?, activity_date = ?, product_category = ?, product_ref = ?, brand = ?,
             quantity = ?, unit = ?, eligible_amount = ?, manual_points = ?, notes = ? WHERE id = ?`,
          [
            input.customerName,
            input.referenceNumber,
            input.activityDate,
            input.productCategory,
            input.productRef,
            input.brand,
            input.quantity,
            input.unit,
            input.eligibleAmount,
            input.manualPoints,
            input.notes,
            activityId,
          ],
          conn,
        )
      } else if (a.status === 'approved') {
        await execute(
          `UPDATE reward_activities SET customer_name = ?, reference_number = ?, activity_date = ?, product_category = ?, product_ref = ?, brand = ?,
             unit = ?, notes = ? WHERE id = ?`,
          [input.customerName, input.referenceNumber, input.activityDate, input.productCategory, input.productRef, input.brand, input.unit, input.notes, activityId],
          conn,
        )
      } else {
        return { ok: false as const, error: `A ${a.status} sale cannot be edited.` }
      }
      await writeAudit(
        { actorType: 'admin', actorId: admin.adminId, action: 'activity.updated', entityType: 'reward_activity', entityId: activityId, summary: input.referenceNumber },
        conn,
      )
      return { ok: true as const }
    })
  } catch (error) {
    if (isDuplicateKeyError(error)) return { ok: false as const, error: 'This invoice / reference number is already recorded for this contractor.' }
    throw error
  }
}

export const saleReturnSchema = z.object({
  quantity: z.preprocess((v) => (v === '' || v == null ? 0 : v), z.coerce.number().min(0).max(10_000_000)),
  amount: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.number().min(0).max(1_000_000_000).nullable()),
  reason: z.string().trim().min(3, 'Give a reason (e.g. 5 bags returned).').max(255),
})

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Records a partial (or full) return on an approved sale and takes back points/tokens in proportion
 * to the returned share. The returned part shows as rejected in the contractor's My Sales.
 */
export async function recordSaleReturn(admin: AdminSession, activityId: number, input: z.infer<typeof saleReturnSchema>) {
  try {
    return await withTransaction(async (conn) => {
      const a = await queryOne<{ status: string; contractor_id: number; reference_number: string; quantity: number; eligible_amount: number; unit: string | null }>(
        'SELECT status, contractor_id, reference_number, quantity, eligible_amount, unit FROM reward_activities WHERE id = ? FOR UPDATE',
        [activityId],
        conn,
      )
      if (!a) return { ok: false as const, error: 'Sale not found.' }
      if (a.status !== 'approved') return { ok: false as const, error: 'Returns can only be recorded on approved sales.' }

      const prior = await queryOne<{ quantity: number; amount: number; points: number; tokens: number }>(
        `SELECT COALESCE(SUM(quantity), 0) AS quantity, COALESCE(SUM(amount), 0) AS amount,
                COALESCE(SUM(points), 0) AS points, COALESCE(SUM(tokens), 0) AS tokens
         FROM sale_returns WHERE activity_id = ?`,
        [activityId],
        conn,
      )
      const qty = Number(a.quantity)
      const amountTotal = Number(a.eligible_amount)
      const qtyLeft = round2(qty - Number(prior?.quantity ?? 0))
      const amountLeft = round2(amountTotal - Number(prior?.amount ?? 0))

      let share: number
      let returnQty = 0
      let returnAmount: number
      if (qty > 0) {
        if (!(input.quantity > 0)) return { ok: false as const, error: 'Enter how many units were returned.' }
        if (input.quantity > qtyLeft) return { ok: false as const, error: `Only ${qtyLeft} × ${(a.unit ?? 'units').replace(/^per\s+/i, '')} left on this sale.` }
        returnQty = input.quantity
        share = returnQty / qty
        returnAmount = input.amount ?? round2(amountTotal * share)
      } else {
        if (!(input.amount && input.amount > 0)) return { ok: false as const, error: 'Enter the returned amount.' }
        if (amountTotal <= 0) return { ok: false as const, error: 'This sale has no quantity or amount to return.' }
        returnAmount = input.amount
        share = returnAmount / amountTotal
      }
      if (returnAmount > amountLeft) returnAmount = Math.max(0, amountLeft)
      const fullyReturned = qty > 0 ? returnQty >= qtyLeft : returnAmount >= amountLeft

      const earned = await query<{ currency: 'points' | 'tokens'; token_category_id: number | null; earned: number }>(
        `SELECT currency, token_category_id, SUM(amount) AS earned FROM reward_transactions
         WHERE activity_id = ? AND entry_type = 'earn' GROUP BY currency, token_category_id`,
        [activityId],
        conn,
      )
      const earnedPoints = earned.filter((e) => e.currency === 'points').reduce((n, e) => n + Number(e.earned), 0)
      const earnedTokens = earned.filter((e) => e.currency === 'tokens').reduce((n, e) => n + Number(e.earned), 0)
      const pointsLeft = earnedPoints - Number(prior?.points ?? 0)
      const tokensLeft = earnedTokens - Number(prior?.tokens ?? 0)
      // The last return takes whatever is left, so rounding never leaves points behind.
      const points = Math.max(0, Math.min(pointsLeft, fullyReturned ? pointsLeft : Math.round(earnedPoints * share)))
      const tokens = Math.max(0, Math.min(tokensLeft, fullyReturned ? tokensLeft : Math.round(earnedTokens * share)))

      const r = await execute(
        'INSERT INTO sale_returns (activity_id, quantity, amount, points, tokens, reason, created_by_admin_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [activityId, returnQty, returnAmount, points, tokens, input.reason, admin.adminId],
        conn,
      )
      const tokenCategory = earned.find((e) => e.currency === 'tokens')?.token_category_id ?? null
      for (const [currency, amount] of [['points', points], ['tokens', tokens]] as const) {
        if (amount <= 0) continue
        await postLedgerEntry(conn, {
          contractorId: a.contractor_id,
          currency,
          tokenCategoryId: currency === 'tokens' ? tokenCategory : null,
          entryType: 'reversal',
          amount,
          idempotencyKey: `return:${r.insertId}:${currency}`,
          reason: `Return - ${a.reference_number}: ${input.reason}`,
          activityId,
          actorType: 'admin',
          actorId: admin.adminId,
        })
      }
      await writeAudit(
        {
          actorType: 'admin',
          actorId: admin.adminId,
          action: 'activity.returned',
          entityType: 'reward_activity',
          entityId: activityId,
          summary: `${a.reference_number}: returned ${returnQty || ''} ${a.unit ?? ''} Rs.${returnAmount}, -${points} pts`.replace(/\s+/g, ' '),
        },
        conn,
      )
      const what = returnQty > 0 ? `${returnQty.toLocaleString('en-IN')} × ${(a.unit ?? 'units').replace(/^per\s+/i, '')}` : `Rs. ${returnAmount.toLocaleString('en-IN')}`
      await notify(
        conn,
        a.contractor_id,
        'sale',
        'sale_returned',
        'Sale return recorded',
        `${what} of sale ${a.reference_number} were returned${points ? `; ${points.toLocaleString('en-IN')} points deducted` : ''}. ${input.reason}`,
        admin.adminId,
      )
      return { ok: true as const, points, tokens }
    })
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      return { ok: false as const, error: "The contractor has already used these points, so they can't be deducted. Adjust their balance under Points & Tokens first." }
    }
    throw error
  }
}
