'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Sparkles } from 'lucide-react'
import { productCategories, products } from '@/lib/mock-data'
import type { ProductCategoryId } from '@/lib/types'
import { SectionTitle } from '@/components/contractor/shared/section-title'
import { cn } from '@/lib/utils'

export function ProductCatalogueView() {
  const [category, setCategory] = useState<ProductCategoryId>('tiles')
  const active = productCategories.find((c) => c.id === category)!
  const list = products.filter((p) => p.category === category)

  return (
    <main className="flex flex-col gap-4 p-4">
      <section>
        <SectionTitle>Categories</SectionTitle>
        <div role="radiogroup" aria-label="Product category" className="grid grid-cols-3 gap-2.5">
          {productCategories.map((c) => {
            const selected = c.id === category
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setCategory(c.id)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-xl bg-white p-2 pb-2.5 text-center shadow-[0_1px_4px_rgba(28,35,64,0.08)] ring-2 transition-colors focus-visible:outline-2 focus-visible:outline-brand',
                  selected ? 'ring-brand' : 'ring-transparent',
                )}
              >
                <span className="relative aspect-square w-full overflow-hidden rounded-lg bg-app-bg">
                  <Image src={c.image} alt="" fill sizes="120px" className="object-cover" />
                </span>
                <span className="text-[12px] leading-tight font-semibold text-ink">{c.name}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section aria-live="polite">
        <SectionTitle>{active.name}</SectionTitle>
        <ul className="flex flex-col gap-2.5">
          {list.map((p) => (
            <li key={p.id} className="flex gap-3 rounded-xl bg-white p-3 shadow-[0_1px_3px_rgba(28,35,64,0.08)]">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-app-bg">
                <Image src={active.image} alt={p.name} fill sizes="64px" className="object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{p.name}</p>
                <p className="text-[12px] text-ink-muted">
                  {p.brand} · {p.unit}
                </p>
                {p.scheme && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-lavender px-2 py-0.5 text-[11px] font-semibold text-brand">
                    <Sparkles className="size-3" aria-hidden="true" />
                    {p.scheme}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-center text-[11px] text-ink-muted">Reference catalogue only. Contact the store for pricing.</p>
      </section>
    </main>
  )
}
