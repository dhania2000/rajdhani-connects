'use client'

import Link from 'next/link'
import { Minus, Plus, ShoppingCart } from 'lucide-react'
import type { Product } from '@/lib/types'
import { useContractor } from '@/components/contractor/contractor-store'
import { useCart } from './cart-store'

/** "Add to cart" button that turns into a - qty + stepper once the product is in the cart. */
export function AddToCartButton({ product }: { product: Product }) {
  const { quantityOf, add, setQuantity } = useCart()
  const qty = quantityOf(product.id)

  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={() => add(product)}
        className="inline-flex h-8 items-center gap-1 rounded-full bg-brand-strong px-3 text-[12px] font-semibold text-white active:scale-[0.97]"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Add to cart
      </button>
    )
  }

  return (
    <div className="inline-flex h-8 items-center rounded-full border border-brand/30 bg-lavender" role="group" aria-label={`${product.name} quantity`}>
      <button type="button" onClick={() => setQuantity(product.id, qty - 1)} className="flex size-8 items-center justify-center text-brand" aria-label="Decrease quantity">
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-6 text-center text-[13px] font-bold text-brand tabular-nums" aria-live="polite">
        {qty}
      </span>
      <button type="button" onClick={() => setQuantity(product.id, qty + 1)} className="flex size-8 items-center justify-center text-brand" aria-label="Increase quantity">
        <Plus className="size-3.5" />
      </button>
    </div>
  )
}

/** Sticky bar above the bottom navigation while the cart has items. */
export function CartBar() {
  const { count, estimatedPoints } = useCart()
  const { formatPts } = useContractor()
  if (count === 0) return null
  return (
    <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 mx-3 mb-2">
      <Link
        href="/contractor/cart"
        className="flex items-center justify-between gap-3 rounded-xl bg-brand-strong px-4 py-3 text-white shadow-[0_6px_20px_rgba(76,29,149,0.35)]"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart className="size-4" aria-hidden="true" />
          {count} item{count === 1 ? '' : 's'}
          {estimatedPoints > 0 && <span className="font-normal text-white/80">· ~{formatPts(estimatedPoints)}</span>}
        </span>
        <span className="text-sm font-semibold">View cart</span>
      </Link>
    </div>
  )
}

/** Cart icon with item count, for page headers. */
export function CartHeaderButton() {
  const { count } = useCart()
  return (
    <Link
      href="/contractor/cart"
      className="relative flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10"
      aria-label={count ? `Cart, ${count} items` : 'Cart'}
    >
      <ShoppingCart className="size-[22px]" />
      {count > 0 && (
        <span className="absolute top-1 right-0.5 flex min-w-4 items-center justify-center rounded-full bg-warn px-1 text-[10px] font-bold text-navy">{count}</span>
      )}
    </Link>
  )
}
