'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { ProductOption } from '@/lib/server/catalogue-admin'
import { cn } from '@/lib/utils'

type Source = 'name' | 'brand' | 'unit' | 'category' | 'description' | 'label'

const valueOf = (p: ProductOption, source: Source) =>
  source === 'label' ? [p.brand, p.name].filter(Boolean).join(' ') : p[source]

type FieldEl = HTMLInputElement | HTMLTextAreaElement

function field(form: HTMLFormElement, name: string): FieldEl | null {
  const el = form.elements.namedItem(name)
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el : null
}

/**
 * Optional "pick from catalogue" dropdown. Choosing a product writes its details into other fields
 * of the same form (by field name); every field stays editable afterwards.
 * With `points`, the product's points per unit x quantity go into the points field and follow
 * quantity changes until the admin types their own points.
 */
export function ProductPicker({
  products,
  fill,
  points,
  className,
  hint = 'Fills the product details below. You can still edit them.',
}: {
  products: ProductOption[]
  /** Form field name -> product attribute to copy into it. */
  fill: Record<string, Source>
  points?: { field: string; quantityField: string }
  className?: string
  hint?: string
}) {
  const id = useId()
  const ref = useRef<HTMLSelectElement>(null)
  const [picked, setPicked] = useState<ProductOption | null>(null)

  // Keep points = per-unit x quantity while the picked product has points and the admin hasn't overridden them.
  useEffect(() => {
    const form = ref.current?.form
    if (!form || !points || picked?.points == null) return
    const qty = field(form, points.quantityField)
    const pts = field(form, points.field)
    if (!qty || !pts) return
    let auto = true
    const perUnit = picked.points
    const recalc = () => {
      if (!auto) return
      const q = Number(qty.value)
      pts.value = Number.isFinite(q) && q > 0 ? String(Math.round(perUnit * q)) : ''
    }
    const manual = (e: Event) => {
      if (e.isTrusted) auto = false
    }
    if (!(Number(qty.value) > 0)) qty.value = '1'
    recalc()
    qty.addEventListener('input', recalc)
    pts.addEventListener('input', manual)
    return () => {
      qty.removeEventListener('input', recalc)
      pts.removeEventListener('input', manual)
    }
  }, [picked, points])

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const product = products.find((p) => String(p.id) === e.target.value) ?? null
    const form = ref.current?.form
    setPicked(product)
    if (!product || !form) return
    for (const [name, source] of Object.entries(fill)) {
      const el = field(form, name)
      if (el) {
        el.value = valueOf(product, source)
        el.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
  }

  if (products.length === 0) return null

  const groups = products.reduce<Record<string, ProductOption[]>>((acc, p) => {
    ;(acc[p.category] ??= []).push(p)
    return acc
  }, {})

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        Pick from product catalogue
      </label>
      <select
        id={id}
        ref={ref}
        defaultValue=""
        onChange={onChange}
        className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink outline-none focus:border-brand"
      >
        <option value="">Select a product (optional)</option>
        {Object.entries(groups).map(([category, items]) => (
          <optgroup key={category} label={category}>
            {items.map((p) => (
              <option key={p.id} value={p.id}>
                {[p.brand, p.name].filter(Boolean).join(' ')}
                {p.unit ? ` (${p.unit})` : ''}
                {p.points != null ? ` - ${p.points} pts/unit` : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <p className="text-xs text-ink-muted">
        {picked?.points != null && points ? `${picked.points} pts per unit: reward points follow the quantity. ` : ''}
        {hint}
      </p>
    </div>
  )
}
