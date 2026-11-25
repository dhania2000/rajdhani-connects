'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Sparkles, Wand2 } from 'lucide-react'
import type { Product, ProductCategory, ProductCategoryId } from '@/lib/types'
import { EmptyState } from '@/components/contractor/shared/empty-state'
import { useContractor } from '@/components/contractor/contractor-store'
import { AddToCartButton, CartBar } from '@/components/contractor/cart/cart-controls'
import { SectionTitle } from '@/components/contractor/shared/section-title'
import { cn } from '@/lib/utils'

export function ProductCatalogueView({ categories, products }: { categories: ProductCategory[]; products: Product[] }) {
  const { formatPts } = useContractor()
  const [category, setCategory] = useState<ProductCategoryId>(categories[0]?.id ?? '')
  const active = categories.find((c) => c.id === category) ?? categories[0]
  const list = products.filter((p) => p.category === active?.id)

  if (!active) {
    return (
      <main className="p-4">
        <EmptyState title="Catalogue coming soon" description="The store has not added any products yet." />
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-4 p-4">
      {products.some((p) => p.texture) && (
        <Link
          href="/contractor/visualizer"
          className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-brand-strong to-[#a855f7] px-4 py-3 text-white shadow-sm"
        >
          <Wand2 className="size-6 shrink-0" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-sm font-bold">Try tiles on your photo</span>
            <span className="block text-[12px] text-white/85">See how a tile looks on your wall or floor before you buy.</span>
          </span>
        </Link>
      )}
      <section>
        <SectionTitle>Categories</SectionTitle>
        <div role="radiogroup" aria-label="Product category" className="grid grid-cols-3 gap-2.5">
          {categories.map((c) => {
            const selected = c.id === active.id
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
        {list.length === 0 && <EmptyState title="No products in this category yet" />}
        <ul className="flex flex-col gap-2.5">
          {list.map((p) => (
            <li key={p.id} className="flex gap-3 rounded-xl bg-white p-3 shadow-[0_1px_3px_rgba(28,35,64,0.08)]">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-app-bg">
                <Image src={p.image ?? active.image} alt={p.name} fill sizes="64px" className="object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{p.name}</p>
                <p className="text-[12px] text-ink-muted">{[p.brand, p.unit].filter(Boolean).join(' · ')}</p>
                {p.description && <p className="mt-1 text-[12px] leading-snug whitespace-pre-line text-ink-muted">{p.description}</p>}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  {p.points ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-bold text-[#047857]">
                      Earn {formatPts(p.points)}
                      {p.unit ? ` / ${p.unit.replace(/^per\s+/i, '')}` : ''}
                    </span>
                  ) : (
                    <span />
                  )}
                  <AddToCartButton product={p} />
                </div>
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
        <p className="mt-3 text-center text-[11px] text-ink-muted">
          Add products to your cart and send them to the store. Points are credited when the sale is recorded.
        </p>
      </section>
      <CartBar />
    </main>
  )
}
