import { z } from 'zod'
import { execute, isDuplicateKeyError, query, queryOne } from './db'
import { writeAudit } from './audit'
import type { AdminSession } from './auth'
import type { LedgerEntry, LedgerEntryType } from '@/lib/types'

type Result = { ok: true } | { ok: false; error: string }

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)

const activeFlag = z.preprocess((v) => (v === 'on' || v === 'active' ? 'active' : 'inactive'), z.enum(['active', 'inactive']))

// ---------------------------------------------------------------------------
// Product categories & products
// ---------------------------------------------------------------------------

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Enter a category name.').max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,40}$/, 'Short code must be 2-40 lowercase letters, numbers or dashes.'),
  imageUrl: optionalText(500),
  displayOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: activeFlag,
})

export const productSchema = z.object({
  categoryId: z.coerce.number().int().positive('Choose a category.'),
  name: z.string().trim().min(2, 'Enter a product name.').max(150),
  brand: optionalText(80),
  unit: optionalText(60),
  schemeLabel: optionalText(80),
  /** Optional points a contractor earns per unit of this product. */
  rewardPoints: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().int('Whole points only.').min(0, 'Points cannot be negative.').max(10_000_000).nullable(),
  ),
  description: optionalText(2000),
  imageUrl: optionalText(500),
  displayOrder: z.coerce.number().int().min(0).max(9999).default(0),
  status: activeFlag,
})

/** Turns a category name into a URL-safe code, e.g. "Tile Adhesive / Glue" -> "tile-adhesive-glue". */
export function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export interface CategoryRow {
  id: number
  slug: string
  name: string
  image_url: string | null
  display_order: number
  status: 'active' | 'inactive'
  product_count: number
}

export interface ProductRow {
  id: number
  category_id: number
  category_name: string
  name: string
  brand: string | null
  unit: string | null
  scheme_label: string | null
  reward_points: number | null
  description: string | null
  image_url: string | null
  display_order: number
  status: 'active' | 'inactive'
}

/** Catalogue products offered in admin dropdowns (Sales, Reward Rules, Points) to auto-fill product details. */
export interface ProductOption {
  id: number
  name: string
  brand: string
  unit: string
  category: string
  description: string
  /** Reward points per unit, if the admin set them. */
  points: number | null
  image: string | null
}

export async function listProductOptions(): Promise<ProductOption[]> {
  const rows = await query<{
    id: number
    name: string
    brand: string | null
    unit: string | null
    category: string
    description: string | null
    reward_points: number | null
    image_url: string | null
  }>(
    `SELECT p.id, p.name, p.brand, p.unit, c.name AS category, p.description, p.reward_points, COALESCE(p.image_url, c.image_url) AS image_url
     FROM products p JOIN product_categories c ON c.id = p.category_id
     WHERE p.status = 'active' ORDER BY c.display_order, c.name, p.display_order, p.name LIMIT 2000`,
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    brand: r.brand ?? '',
    unit: r.unit ?? '',
    category: r.category,
    description: r.description ?? '',
    points: r.reward_points === null ? null : Number(r.reward_points),
    image: r.image_url,
  }))
}

/** "Brand Product" labels for catalogue products, used in ledger reasons. */
export async function productLabels(ids: number[]) {
  if (ids.length === 0) return new Map<number, string>()
  const rows = await query<{ id: number; name: string; brand: string | null }>(
    `SELECT id, name, brand FROM products WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids,
  )
  return new Map(rows.map((p) => [Number(p.id), [p.brand, p.name].filter(Boolean).join(' ')]))
}

export function listCategories() {
  return query<CategoryRow>(
    `SELECT c.id, c.slug, c.name, c.image_url, c.display_order, c.status,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
     FROM product_categories c ORDER BY c.display_order, c.name`,
  )
}

export function listProducts() {
  return query<ProductRow>(
    `SELECT p.id, p.category_id, c.name AS category_name, p.name, p.brand, p.unit, p.scheme_label, p.reward_points, p.description, p.image_url, p.display_order, p.status
     FROM products p JOIN product_categories c ON c.id = p.category_id
     ORDER BY c.display_order, c.name, p.display_order, p.name`,
  )
}

export async function saveCategory(admin: AdminSession, id: number | null, input: z.infer<typeof categorySchema>): Promise<Result> {
  const values = [input.slug, input.name, input.imageUrl, input.displayOrder, input.status]
  try {
    if (id) {
      const r = await execute('UPDATE product_categories SET slug = ?, name = ?, image_url = ?, display_order = ?, status = ? WHERE id = ?', [...values, id])
      if (r.affectedRows === 0) return { ok: false, error: 'Category not found.' }
    } else {
      const r = await execute('INSERT INTO product_categories (slug, name, image_url, display_order, status) VALUES (?, ?, ?, ?, ?)', values)
      id = r.insertId
    }
  } catch (error) {
    if (isDuplicateKeyError(error)) return { ok: false, error: 'Another category already uses this slug.' }
    throw error
  }
  await writeAudit({ actorType: 'admin', actorId: admin.adminId, action: 'product_category.saved', entityType: 'product_category', entityId: id, summary: input.name })
  return { ok: true }
}

export async function saveProduct(admin: AdminSession, id: number | null, input: z.infer<typeof productSchema>): Promise<Result> {
  const category = await queryOne<{ id: number }>('SELECT id FROM product_categories WHERE id = ?', [input.categoryId])
  if (!category) return { ok: false, error: 'Choose a valid category.' }
  const values = [input.categoryId, input.name, input.brand, input.unit, input.schemeLabel, input.rewardPoints, input.description, input.imageUrl, input.displayOrder, input.status]
  if (id) {
    const r = await execute(
      'UPDATE products SET category_id = ?, name = ?, brand = ?, unit = ?, scheme_label = ?, reward_points = ?, description = ?, image_url = ?, display_order = ?, status = ? WHERE id = ?',
      [...values, id],
    )
    if (r.affectedRows === 0) return { ok: false, error: 'Product not found.' }
  } else {
    const r = await execute(
      'INSERT INTO products (category_id, name, brand, unit, scheme_label, reward_points, description, image_url, display_order, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      values,
    )
    id = r.insertId
  }
  await writeAudit({ actorType: 'admin', actorId: admin.adminId, action: 'product.saved', entityType: 'product', entityId: id, summary: input.name })
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Contractor scheme targets
// ---------------------------------------------------------------------------

export const targetSchema = z.object({
  title: z.string().trim().min(2, 'Enter a target title.').max(150),
  targetValue: z.coerce.number().positive('Target must be greater than 0.').max(1e12),
  currentValue: z.coerce.number().min(0).max(1e12).default(0),
  unit: z.enum(['points', 'tokens', 'amount', 'quantity']),
  status: z.enum(['in_progress', 'achieved', 'expired']).default('in_progress'),
})

export interface TargetRow {
  id: number
  title: string
  target_value: number
  current_value: number
  unit: 'points' | 'tokens' | 'amount' | 'quantity'
  status: 'in_progress' | 'achieved' | 'expired'
  updated_at: string
}

export function listTargets(contractorId: number) {
  return query<TargetRow>(
    'SELECT id, title, target_value, current_value, unit, status, updated_at FROM contractor_targets WHERE contractor_id = ? ORDER BY id DESC',
    [contractorId],
  )
}

export async function saveTarget(admin: AdminSession, contractorId: number, id: number | null, input: z.infer<typeof targetSchema>): Promise<Result> {
  const status = input.status === 'in_progress' && input.currentValue >= input.targetValue ? 'achieved' : input.status
  const values = [input.title, input.targetValue, input.currentValue, input.unit, status]
  if (id) {
    const r = await execute(
      `UPDATE contractor_targets SET title = ?, target_value = ?, current_value = ?, unit = ?, status = ?,
              achieved_at = IF(?, COALESCE(achieved_at, UTC_TIMESTAMP()), NULL)
       WHERE id = ? AND contractor_id = ?`,
      [...values, status === 'achieved' ? 1 : 0, id, contractorId],
    )
    if (r.affectedRows === 0) return { ok: false, error: 'Target not found.' }
  } else {
    const r = await execute(
      `INSERT INTO contractor_targets (contractor_id, title, target_value, current_value, unit, status, achieved_at)
       VALUES (?, ?, ?, ?, ?, ?, IF(?, UTC_TIMESTAMP(), NULL))`,
      [contractorId, ...values, status === 'achieved' ? 1 : 0],
    )
    id = r.insertId
  }
  await writeAudit({ actorType: 'admin', actorId: admin.adminId, action: 'target.saved', entityType: 'contractor', entityId: contractorId, summary: input.title })
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Contractor account ledger (Udhar / Advance)
// ---------------------------------------------------------------------------

export const ACCOUNT_ENTRY_TYPES = ['opening', 'credit', 'debit', 'udhar', 'advance'] as const

export const accountEntrySchema = z.object({
  entryType: z.enum(ACCOUNT_ENTRY_TYPES),
  amount: z.coerce.number().positive('Amount must be greater than 0.').max(1e10),
  description: z.string().trim().min(2, 'Enter a description.').max(200),
  reference: optionalText(80),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.'),
})

export interface AccountEntryRow {
  id: number
  entry_type: (typeof ACCOUNT_ENTRY_TYPES)[number]
  amount: number
  description: string
  reference: string | null
  entry_date: string
  admin_name: string | null
}

export function listAccountEntries(contractorId: number) {
  return query<AccountEntryRow>(
    `SELECT e.id, e.entry_type, e.amount, e.description, e.reference, e.entry_date, a.name AS admin_name
     FROM contractor_account_entries e LEFT JOIN admins a ON a.id = e.created_by_admin_id
     WHERE e.contractor_id = ? ORDER BY e.entry_date DESC, e.id DESC LIMIT 500`,
    [contractorId],
  )
}

export async function saveAccountEntry(
  admin: AdminSession,
  contractorId: number,
  id: number | null,
  input: z.infer<typeof accountEntrySchema>,
): Promise<Result> {
  const values = [input.entryType, input.amount, input.description, input.reference, input.entryDate]
  if (id) {
    const r = await execute(
      'UPDATE contractor_account_entries SET entry_type = ?, amount = ?, description = ?, reference = ?, entry_date = ? WHERE id = ? AND contractor_id = ?',
      [...values, id, contractorId],
    )
    if (r.affectedRows === 0) return { ok: false, error: 'Entry not found.' }
  } else {
    await execute(
      `INSERT INTO contractor_account_entries (contractor_id, entry_type, amount, description, reference, entry_date, created_by_admin_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [contractorId, ...values, admin.adminId],
    )
  }
  await writeAudit({
    actorType: 'admin',
    actorId: admin.adminId,
    action: 'account_entry.saved',
    entityType: 'contractor',
    entityId: contractorId,
    summary: `${input.entryType} ${input.amount}: ${input.description}`,
  })
  return { ok: true }
}

export async function getContractorAccountLedger(contractorId: number): Promise<{ openingBalance: number; entries: LedgerEntry[] }> {
  const rows = await query<{ id: number; entry_type: string; amount: number; description: string; entry_date: string }>(
    `SELECT id, entry_type, amount, description, entry_date FROM contractor_account_entries
     WHERE contractor_id = ? ORDER BY entry_date DESC, id DESC LIMIT 500`,
    [contractorId],
  )
  let openingBalance = 0
  const entries: LedgerEntry[] = []
  for (const r of rows) {
    if (r.entry_type === 'opening') openingBalance += Number(r.amount)
    else
      entries.push({
        id: String(r.id),
        type: r.entry_type as LedgerEntryType,
        amount: Number(r.amount),
        description: r.description,
        date: String(r.entry_date).slice(0, 10),
      })
  }
  return { openingBalance, entries }
}
