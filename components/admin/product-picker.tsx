'use client'

import { useId, useRef } from 'react'
import type { ProductOption } from '@/lib/server/catalogue-admin'
import { cn } from '@/lib/utils'

type Source = 'name' | 'brand' | 'unit' | 'category' | 'description' | 'label'

const valueOf = (p: ProductOption, source: Source) =>
  source === 'label' ? [p.brand, p.name].filter(Boolean).join(' ') : p[source]

/**
 * Optional "pick from catalogue" dropdown. Choosing a product writes its details into other fields
 * of the same form (by field name); every field stays editable afterwards.
 */
export function ProductPicker({
  products,
  fill,
  className,
  hint = 'Fills the product details below. You can still edit them.',
}: {
  products: ProductOption[]
  /** Form field name -> product attribute to copy into it. */
  fill: Record<string, Source>
  className?: string
  hint?: string
}) {
  const id = useId()
  const ref = useRef<HTMLSelectElement>(null)

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const product = products.find((p) => String(p.id) === e.target.value)
    const form = ref.current?.form
    if (!product || !form) return
    for (const [field, source] of Object.entries(fill)) {
      const el = form.elements.namedItem(field)
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
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
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <p className="text-xs text-ink-muted">{hint}</p>
    </div>
  )
}
