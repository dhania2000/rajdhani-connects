import { z } from 'zod'
import { execute, queryOne } from './db'
import { writeAudit } from './audit'
import type { AdminSession } from './auth'

export const DELETABLE_ENTITIES = [
  'rule',
  'activity',
  'gift',
  'redemption',
  'offer',
  'notification',
  'product',
  'product_category',
  'target',
  'account_entry',
] as const
export type DeletableEntity = (typeof DELETABLE_ENTITIES)[number]

type Result = { ok: true } | { ok: false; error: string }

// Ledger-linked rows are protected by ON DELETE RESTRICT; translate that into an actionable message.
function isReferenceError(err: unknown) {
  return typeof err === 'object' && err !== null && 'errno' in err && (err as { errno: number }).errno === 1451
}

const CONFIG: Record<
  DeletableEntity,
  { table: string; label: string; nameColumn: string; guard?: (id: number) => Promise<string | null>; inUse: string }
> = {
  rule: {
    table: 'reward_rules',
    label: 'Rule',
    nameColumn: 'name',
    inUse: 'This rule has already awarded points. Archive it instead so the ledger stays intact.',
  },
  activity: {
    table: 'reward_activities',
    label: 'Activity',
    nameColumn: 'reference_number',
    guard: async (id) => {
      const a = await queryOne<{ status: string }>('SELECT status FROM reward_activities WHERE id = ?', [id])
      return a?.status === 'approved' ? 'Approved activities have posted rewards. Reverse the activity first.' : null
    },
    inUse: 'This activity has ledger entries and cannot be deleted.',
  },
  gift: {
    table: 'gift_catalogue',
    label: 'Gift',
    nameColumn: 'name',
    inUse: 'Contractors have claimed this gift. Archive it instead to keep claim history.',
  },
  redemption: {
    table: 'redemption_requests',
    label: 'Claim',
    nameColumn: 'claim_code',
    guard: async (id) => {
      const r = await queryOne<{ status: string }>('SELECT status FROM redemption_requests WHERE id = ?', [id])
      return r && !['rejected', 'cancelled'].includes(r.status) ? 'Only rejected or cancelled claims can be deleted.' : null
    },
    inUse: 'This claim has ledger entries and cannot be deleted.',
  },
  offer: { table: 'offers', label: 'Offer', nameColumn: 'title', inUse: 'This offer is still referenced and cannot be deleted.' },
  notification: {
    table: 'notifications',
    label: 'Notification',
    nameColumn: 'title',
    inUse: 'This notification is still referenced and cannot be deleted.',
  },
  product: { table: 'products', label: 'Product', nameColumn: 'name', inUse: 'This product is still referenced and cannot be deleted.' },
  product_category: {
    table: 'product_categories',
    label: 'Category',
    nameColumn: 'name',
    guard: async (id) => {
      const r = await queryOne<{ n: number }>('SELECT COUNT(*) AS n FROM products WHERE category_id = ?', [id])
      return Number(r?.n ?? 0) > 0 ? 'Move or delete the products in this category first.' : null
    },
    inUse: 'This category still has products.',
  },
  target: { table: 'contractor_targets', label: 'Target', nameColumn: 'title', inUse: 'This target cannot be deleted.' },
  account_entry: {
    table: 'contractor_account_entries',
    label: 'Ledger entry',
    nameColumn: 'description',
    inUse: 'This ledger entry cannot be deleted.',
  },
}

export async function deleteRecord(admin: AdminSession, entity: DeletableEntity, id: number): Promise<Result> {
  const cfg = CONFIG[entity]
  const row = await queryOne<{ name: string }>(`SELECT ${cfg.nameColumn} AS name FROM ${cfg.table} WHERE id = ?`, [id])
  if (!row) return { ok: false, error: `${cfg.label} not found.` }
  const blocked = await cfg.guard?.(id)
  if (blocked) return { ok: false, error: blocked }
  try {
    await execute(`DELETE FROM ${cfg.table} WHERE id = ?`, [id])
  } catch (err) {
    if (isReferenceError(err)) return { ok: false, error: cfg.inUse }
    throw err
  }
  await writeAudit({
    actorType: 'admin',
    actorId: admin.adminId,
    action: `${entity}.deleted`,
    entityType: entity,
    entityId: id,
    summary: `Deleted ${cfg.label.toLowerCase()} ${row.name}`,
  })
  return { ok: true }
}

export const notificationEditSchema = z.object({
  title: z.string().trim().min(2).max(150),
  body: z.string().trim().min(2).max(500),
})

export async function updateNotification(admin: AdminSession, id: number, input: z.infer<typeof notificationEditSchema>): Promise<Result> {
  const r = await execute('UPDATE notifications SET title = ?, body = ? WHERE id = ?', [input.title, input.body, id])
  if (r.affectedRows === 0) return { ok: false, error: 'Notification not found.' }
  await writeAudit({ actorType: 'admin', actorId: admin.adminId, action: 'notification.updated', entityType: 'notification', entityId: id, summary: input.title })
  return { ok: true }
}
