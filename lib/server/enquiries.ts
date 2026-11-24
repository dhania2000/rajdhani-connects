import { z } from 'zod'
import { execute, isDuplicateKeyError, padCode, query, queryOne, withTransaction } from './db'
import { writeAudit } from './audit'
import { notifyContractor, recordApprovedSale, SaleError } from './rewards-engine'
import type { PoolConnection } from 'mysql2/promise'
import type { AdminSession } from './auth'
import type { CartRequest, EnquiryStatus } from '@/lib/types'

// ---------------------------------------------------------------------------
// Contractor cart requests ("enquiries"): products a contractor asks the store to supply.
// They carry estimated points only; points are credited when the admin records the sale.
// ---------------------------------------------------------------------------

const optional = (max: number) => z.preprocess((v) => (typeof v === 'string' && v.trim() ? v.trim() : null), z.string().max(max).nullable())

export const cartRequestSchema = z.object({
  idempotencyKey: z.string().uuid(),
  customerName: optional(150),
  customerMobile: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() ? v.trim() : null),
    z.string().regex(/^[+\d\s-]{6,20}$/, 'Enter a valid mobile number.').nullable(),
  ),
  note: optional(1000),
  items: z
    .array(z.object({ productId: z.coerce.number().int().positive(), quantity: z.coerce.number().positive('Quantity must be more than 0.').max(1_000_000) }))
    .min(1, 'Your cart is empty.')
    .max(50, 'A request can have up to 50 products.'),
})

export type CartRequestInput = z.infer<typeof cartRequestSchema>

export async function createCartRequest(contractorId: number, input: CartRequestInput) {
  const prior = await queryOne<{ enquiry_code: string; contractor_id: number }>(
    'SELECT enquiry_code, contractor_id FROM product_enquiries WHERE idempotency_key = ?',
    [input.idempotencyKey],
  )
  if (prior) return prior.contractor_id === contractorId ? { ok: true as const, code: prior.enquiry_code } : { ok: false as const, error: 'Invalid request.' }

  const ids = [...new Set(input.items.map((i) => i.productId))]
  const products = await query<{ id: number; name: string; brand: string | null; unit: string | null; category: string; reward_points: number | null }>(
    `SELECT p.id, p.name, p.brand, p.unit, c.name AS category, p.reward_points
     FROM products p JOIN product_categories c ON c.id = p.category_id
     WHERE p.status = 'active' AND c.status = 'active' AND p.id IN (${ids.map(() => '?').join(',')})`,
    ids,
  )
  const byId = new Map(products.map((p) => [p.id, p]))
  const lines = input.items.filter((i) => byId.has(i.productId))
  if (lines.length === 0) return { ok: false as const, error: 'These products are no longer available.' }

  const estimated = Math.round(lines.reduce((sum, l) => sum + Number(byId.get(l.productId)!.reward_points ?? 0) * l.quantity, 0))

  try {
    return await withTransaction(async (conn) => {
      const r = await execute(
        `INSERT INTO product_enquiries (contractor_id, customer_name, customer_mobile, note, estimated_points, idempotency_key)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [contractorId, input.customerName, input.customerMobile, input.note, estimated, input.idempotencyKey],
        conn,
      )
      const code = padCode('REQ-', r.insertId, 5)
      await execute('UPDATE product_enquiries SET enquiry_code = ? WHERE id = ?', [code, r.insertId], conn)
      for (const l of lines) {
        const p = byId.get(l.productId)!
        await execute(
          `INSERT INTO product_enquiry_items (enquiry_id, product_id, product_name, brand, unit, category_name, quantity, points_per_unit)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.insertId, p.id, p.name, p.brand, p.unit, p.category, l.quantity, p.reward_points],
          conn,
        )
      }
      await writeAudit(
        { actorType: 'contractor', actorId: contractorId, action: 'enquiry.created', entityType: 'enquiry', entityId: r.insertId, summary: `${code}: ${lines.length} product(s)` },
        conn,
      )
      return { ok: true as const, code }
    })
  } catch (error) {
    if (isDuplicateKeyError(error)) return { ok: true as const, code: '' }
    throw error
  }
}

interface EnquiryRow {
  id: number
  enquiry_code: string
  contractor_id: number
  customer_name: string | null
  customer_mobile: string | null
  note: string | null
  estimated_points: number
  status: EnquiryStatus
  admin_note: string | null
  created_at: string
}

interface ItemRow {
  id: number
  enquiry_id: number
  amount: number | null
  activity_id: number | null
  product_name: string
  brand: string | null
  unit: string | null
  category_name: string | null
  quantity: number
  points_per_unit: number | null
}

async function itemsFor(ids: number[]) {
  if (ids.length === 0) return new Map<number, ItemRow[]>()
  const rows = await query<ItemRow>(
    `SELECT id, enquiry_id, product_name, brand, unit, category_name, quantity, points_per_unit, amount, activity_id
     FROM product_enquiry_items WHERE enquiry_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`,
    ids,
  )
  const map = new Map<number, ItemRow[]>()
  for (const r of rows) map.set(r.enquiry_id, [...(map.get(r.enquiry_id) ?? []), r])
  return map
}

export async function listContractorCartRequests(contractorId: number): Promise<CartRequest[]> {
  const rows = await query<EnquiryRow>(
    `SELECT id, enquiry_code, contractor_id, customer_name, customer_mobile, note, estimated_points, status, admin_note, created_at
     FROM product_enquiries WHERE contractor_id = ? ORDER BY id DESC LIMIT 50`,
    [contractorId],
  )
  const items = await itemsFor(rows.map((r) => r.id))
  return rows.map((r) => ({
    id: r.enquiry_code,
    createdOn: String(r.created_at).slice(0, 10),
    status: r.status,
    customerName: r.customer_name ?? undefined,
    estimatedPoints: Number(r.estimated_points),
    adminNote: r.admin_note ?? undefined,
    items: (items.get(r.id) ?? []).map((i) => ({
      name: [i.brand, i.product_name].filter(Boolean).join(' '),
      unit: i.unit ?? undefined,
      quantity: Number(i.quantity),
      pointsPerUnit: i.points_per_unit === null ? undefined : Number(i.points_per_unit),
    })),
  }))
}

export const ENQUIRY_STATUSES: EnquiryStatus[] = ['new', 'contacted', 'completed', 'cancelled']

export async function listCartRequests(status?: string) {
  const valid = status && (ENQUIRY_STATUSES as string[]).includes(status)
  const rows = await query<EnquiryRow & { contractor_name: string; contractor_mobile: string; contractor_code: string }>(
    `SELECT e.id, e.enquiry_code, e.contractor_id, e.customer_name, e.customer_mobile, e.note, e.estimated_points, e.status, e.admin_note, e.created_at,
            c.name AS contractor_name, c.mobile AS contractor_mobile, c.contractor_code
     FROM product_enquiries e JOIN contractors c ON c.id = e.contractor_id
     ${valid ? 'WHERE e.status = ?' : ''}
     ORDER BY FIELD(e.status, 'new', 'contacted', 'completed', 'cancelled'), e.id DESC LIMIT 200`,
    valid ? [status] : [],
  )
  const items = await itemsFor(rows.map((r) => r.id))
  return rows.map((r) => ({ ...r, items: items.get(r.id) ?? [] }))
}

const STATUS_MESSAGES: Record<EnquiryStatus, string> = {
  new: 'is received',
  contacted: 'is being handled by the store',
  completed: 'is completed',
  cancelled: 'was cancelled',
}

export async function setCartRequestStatus(admin: AdminSession, id: number, status: EnquiryStatus, note: string | null) {
  return withTransaction(async (conn) => {
    const e = await queryOne<{ contractor_id: number; enquiry_code: string; status: EnquiryStatus }>(
      'SELECT contractor_id, enquiry_code, status FROM product_enquiries WHERE id = ? FOR UPDATE',
      [id],
      conn,
    )
    if (!e) return { ok: false as const, error: 'Request not found.' }
    if (e.status === 'completed') return { ok: false as const, error: 'This request is completed and its sales are recorded. Use Sales to record returns.' }
    if (status === 'completed') return { ok: false as const, error: 'Use "Complete & add to sales" to complete a request.' }
    await execute(
      'UPDATE product_enquiries SET status = ?, admin_note = COALESCE(?, admin_note), updated_by_admin_id = ? WHERE id = ?',
      [status, note, admin.adminId, id],
      conn,
    )
    await writeAudit(
      { actorType: 'admin', actorId: admin.adminId, action: `enquiry.${status}`, entityType: 'enquiry', entityId: id, summary: `${e.enquiry_code} ${e.status} -> ${status}` },
      conn,
    )
    if (status !== e.status) {
      await notifyContractor(
        conn,
        e.contractor_id,
        'sale',
        `enquiry_${status}`,
        'Cart request update',
        `Your request ${e.enquiry_code} ${STATUS_MESSAGES[status]}.${note ? ` ${note}` : ''}`,
        admin.adminId,
      )
    }
    return { ok: true as const }
  })
}

export async function countNewCartRequests() {
  const r = await queryOne<{ n: number }>("SELECT COUNT(*) AS n FROM product_enquiries WHERE status = 'new'")
  return Number(r?.n ?? 0)
}

// ---------------------------------------------------------------------------
// Admin edits and completion
// ---------------------------------------------------------------------------

export interface CartLineEdit {
  itemId: number
  /** 0 removes the item from the request. */
  quantity: number
  /** Optional sale amount in rupees for this line. */
  amount: number | null
}

async function applyLineEdits(conn: PoolConnection, enquiryId: number, lines: CartLineEdit[]) {
  for (const l of lines) {
    if (l.quantity <= 0) {
      await execute('DELETE FROM product_enquiry_items WHERE id = ? AND enquiry_id = ?', [l.itemId, enquiryId], conn)
    } else {
      await execute('UPDATE product_enquiry_items SET quantity = ?, amount = ? WHERE id = ? AND enquiry_id = ?', [l.quantity, l.amount, l.itemId, enquiryId], conn)
    }
  }
  const items = await query<ItemRow>(
    `SELECT id, enquiry_id, product_name, brand, unit, category_name, quantity, points_per_unit, amount, activity_id
     FROM product_enquiry_items WHERE enquiry_id = ? ORDER BY id`,
    [enquiryId],
    conn,
  )
  const estimated = Math.round(items.reduce((n, i) => n + Number(i.points_per_unit ?? 0) * Number(i.quantity), 0))
  await execute('UPDATE product_enquiries SET estimated_points = ? WHERE id = ?', [estimated, enquiryId], conn)
  return items
}

async function lockOpenRequest(conn: PoolConnection, id: number) {
  const e = await queryOne<{ id: number; contractor_id: number; enquiry_code: string; status: EnquiryStatus; customer_name: string | null }>(
    'SELECT id, contractor_id, enquiry_code, status, customer_name FROM product_enquiries WHERE id = ? FOR UPDATE',
    [id],
    conn,
  )
  if (!e) return { error: 'Request not found.' as const }
  if (e.status === 'completed') return { error: 'This request is already completed; its sales are recorded.' as const }
  if (e.status === 'cancelled') return { error: 'This request is cancelled.' as const }
  return { e }
}

/** Saves quantity / amount changes (and removals) on an open request. */
export async function saveCartRequestItems(admin: AdminSession, id: number, lines: CartLineEdit[], note: string | null) {
  return withTransaction(async (conn) => {
    const locked = await lockOpenRequest(conn, id)
    if ('error' in locked) return { ok: false as const, error: locked.error }
    const items = await applyLineEdits(conn, id, lines)
    if (items.length === 0) return { ok: false as const, error: 'A request needs at least one product. Cancel it instead.' }
    await execute('UPDATE product_enquiries SET admin_note = COALESCE(?, admin_note), updated_by_admin_id = ? WHERE id = ?', [note, admin.adminId, id], conn)
    await writeAudit({ actorType: 'admin', actorId: admin.adminId, action: 'enquiry.edited', entityType: 'enquiry', entityId: id, summary: locked.e.enquiry_code }, conn)
    return { ok: true as const }
  })
}

/**
 * Applies final quantities, then records one approved sale per product with points =
 * points per unit x final quantity, and marks the request completed. Everything happens in one
 * transaction and a completed request can't be completed again, so points are never doubled.
 */
export async function completeCartRequest(admin: AdminSession, id: number, lines: CartLineEdit[], note: string | null) {
  try {
    return await withTransaction(async (conn) => {
      const locked = await lockOpenRequest(conn, id)
      if ('error' in locked) return { ok: false as const, error: locked.error }
      const { e } = locked
      const items = await applyLineEdits(conn, id, lines)
      if (items.length === 0) return { ok: false as const, error: 'Nothing left to complete. Cancel the request instead.' }

      const today = new Date().toISOString().slice(0, 10)
      let totalPoints = 0
      for (const [n, i] of items.entries()) {
        const sale = await recordApprovedSale(conn, admin, {
          contractorId: e.contractor_id,
          customerName: e.customer_name,
          referenceNumber: `${e.enquiry_code}-${n + 1}`,
          activityDate: today,
          productCategory: i.category_name,
          brand: i.brand,
          productRef: i.product_name,
          quantity: Number(i.quantity),
          unit: i.unit,
          eligibleAmount: Number(i.amount ?? 0),
          // Products without catalogue points fall back to the reward rules.
          manualPoints: i.points_per_unit === null ? null : Math.round(Number(i.points_per_unit) * Number(i.quantity)),
          notes: `From cart request ${e.enquiry_code}`,
        })
        totalPoints += sale.points
        await execute('UPDATE product_enquiry_items SET activity_id = ? WHERE id = ?', [sale.id, i.id], conn)
      }
      await execute(
        "UPDATE product_enquiries SET status = 'completed', admin_note = COALESCE(?, admin_note), updated_by_admin_id = ? WHERE id = ?",
        [note, admin.adminId, id],
        conn,
      )
      await writeAudit(
        { actorType: 'admin', actorId: admin.adminId, action: 'enquiry.completed', entityType: 'enquiry', entityId: id, summary: `${e.enquiry_code}: ${items.length} sale(s), +${totalPoints} pts` },
        conn,
      )
      await notifyContractor(
        conn,
        e.contractor_id,
        'reward',
        'enquiry_completed',
        'Cart request completed',
        `Your request ${e.enquiry_code} is completed and added to My Sales.${totalPoints ? ` You earned ${totalPoints.toLocaleString('en-IN')} points.` : ''}${note ? ` ${note}` : ''}`,
        admin.adminId,
      )
      return { ok: true as const, points: totalPoints, sales: items.length }
    })
  } catch (error) {
    if (error instanceof SaleError) return { ok: false as const, error: error.message }
    if (isDuplicateKeyError(error)) return { ok: false as const, error: 'Sales for this request already exist.' }
    throw error
  }
}
