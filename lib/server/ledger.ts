import type { PoolConnection } from 'mysql2/promise'
import { execute, padCode, queryOne } from './db'

export type EntryType =
  | 'earn_pending'
  | 'pending_confirm'
  | 'pending_cancel'
  | 'earn'
  | 'manual_credit'
  | 'manual_debit'
  | 'reserve'
  | 'release'
  | 'redeem'
  | 'reversal'
  | 'expiry'

type Bucket = 'pending' | 'available' | 'reserved' | 'redeemed' | 'reversed' | 'expired' | 'total_earned'

const EFFECTS: Record<EntryType, Partial<Record<Bucket, 1 | -1>>> = {
  earn_pending: { pending: 1 },
  pending_confirm: { pending: -1, available: 1, total_earned: 1 },
  pending_cancel: { pending: -1 },
  earn: { available: 1, total_earned: 1 },
  manual_credit: { available: 1, total_earned: 1 },
  manual_debit: { available: -1 },
  reserve: { available: -1, reserved: 1 },
  release: { reserved: -1, available: 1 },
  redeem: { reserved: -1, redeemed: 1 },
  reversal: { available: -1, reversed: 1 },
  expiry: { available: -1, expired: 1 },
}

export class InsufficientBalanceError extends Error {
  constructor(message = 'Insufficient reward balance.') {
    super(message)
    this.name = 'InsufficientBalanceError'
  }
}

export interface LedgerEntryInput {
  contractorId: number
  currency?: 'points' | 'tokens'
  tokenCategoryId?: number | null
  entryType: EntryType
  amount: number
  idempotencyKey: string
  reason?: string | null
  activityId?: number | null
  redemptionId?: number | null
  ruleId?: number | null
  reversesTxnId?: number | null
  actorType: 'admin' | 'contractor' | 'system'
  actorId: number | null
}

export interface BalanceRow {
  pending: number
  available: number
  reserved: number
  redeemed: number
  reversed: number
  expired: number
  total_earned: number
}

/**
 * Posts a single ledger entry and updates the cached balance in the caller's transaction.
 * The balance row is locked with SELECT ... FOR UPDATE so concurrent posts serialize per contractor.
 * Re-posting the same idempotency key returns the original transaction without side effects.
 */
export async function postLedgerEntry(conn: PoolConnection, input: LedgerEntryInput) {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new Error('Ledger amount must be a positive whole number.')
  }
  const currency = input.currency ?? 'points'
  const categoryKey = currency === 'tokens' ? (input.tokenCategoryId ?? 0) : 0

  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM reward_transactions WHERE idempotency_key = ?',
    [input.idempotencyKey],
    conn,
  )
  if (existing) return { transactionId: existing.id, duplicate: true }

  await execute(
    'INSERT IGNORE INTO reward_balances (contractor_id, currency, token_category_id) VALUES (?, ?, ?)',
    [input.contractorId, currency, categoryKey],
    conn,
  )
  const balance = await queryOne<BalanceRow>(
    `SELECT pending, available, reserved, redeemed, reversed, expired, total_earned
     FROM reward_balances WHERE contractor_id = ? AND currency = ? AND token_category_id = ? FOR UPDATE`,
    [input.contractorId, currency, categoryKey],
    conn,
  )
  if (!balance) throw new Error('Balance row missing after insert.')

  const next = { ...balance }
  for (const [bucket, sign] of Object.entries(EFFECTS[input.entryType]) as [Bucket, 1 | -1][]) {
    next[bucket] = Number(next[bucket]) + sign * input.amount
  }
  if (next.available < 0) throw new InsufficientBalanceError()
  if (next.pending < 0 || next.reserved < 0) throw new Error('Ledger entry would make a balance negative.')

  await execute(
    `UPDATE reward_balances SET pending = ?, available = ?, reserved = ?, redeemed = ?, reversed = ?, expired = ?, total_earned = ?
     WHERE contractor_id = ? AND currency = ? AND token_category_id = ?`,
    [
      next.pending,
      next.available,
      next.reserved,
      next.redeemed,
      next.reversed,
      next.expired,
      next.total_earned,
      input.contractorId,
      currency,
      categoryKey,
    ],
    conn,
  )

  const result = await execute(
    `INSERT INTO reward_transactions
       (contractor_id, currency, token_category_id, entry_type, amount, available_after, idempotency_key, reason,
        activity_id, redemption_id, rule_id, reverses_txn_id, created_by_type, created_by_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.contractorId,
      currency,
      currency === 'tokens' ? (input.tokenCategoryId ?? null) : null,
      input.entryType,
      input.amount,
      next.available,
      input.idempotencyKey,
      input.reason ?? null,
      input.activityId ?? null,
      input.redemptionId ?? null,
      input.ruleId ?? null,
      input.reversesTxnId ?? null,
      input.actorType,
      input.actorId,
    ],
    conn,
  )
  await execute('UPDATE reward_transactions SET txn_code = ? WHERE id = ?', [padCode('TXN-', result.insertId, 7), result.insertId], conn)
  return { transactionId: result.insertId, duplicate: false, balance: next }
}

export async function getPointsBalance(contractorId: number, conn?: PoolConnection): Promise<BalanceRow> {
  const row = await queryOne<BalanceRow>(
    `SELECT pending, available, reserved, redeemed, reversed, expired, total_earned
     FROM reward_balances WHERE contractor_id = ? AND currency = 'points' AND token_category_id = 0`,
    [contractorId],
    conn,
  )
  return row ?? { pending: 0, available: 0, reserved: 0, redeemed: 0, reversed: 0, expired: 0, total_earned: 0 }
}
