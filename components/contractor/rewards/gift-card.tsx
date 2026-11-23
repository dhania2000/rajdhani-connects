'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useContractor } from '@/components/contractor/contractor-store'
import type { Gift, GiftAvailability } from '@/lib/types'
import { cn } from '@/lib/utils'

export const availabilityLabel: Record<GiftAvailability, { label: string; className: string }> = {
  'in-stock': { label: 'In stock', className: 'text-[#047857]' },
  limited: { label: 'Limited stock', className: 'text-[#b45309]' },
  'out-of-stock': { label: 'Out of stock', className: 'text-danger' },
}

export function GiftCard({ gift, availablePoints }: { gift: Gift; availablePoints: number }) {
  const { formatPts } = useContractor()
  const affordable = availablePoints >= gift.points
  const inStock = gift.availability !== 'out-of-stock'
  const avail = availabilityLabel[gift.availability]

  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_1px_4px_rgba(28,35,64,0.08)]">
      <div className="relative aspect-[4/3] bg-white">
        <Image src={gift.image} alt={gift.name} fill sizes="(max-width: 420px) 50vw, 200px" className="object-cover" />
      </div>
      <div className="flex flex-1 flex-col gap-1 border-t border-border p-3">
        <h3 className="text-sm font-semibold text-ink">{gift.name}</h3>
        <p className="text-[13px] font-bold text-brand">{formatPts(gift.points)}</p>
        <p className={cn('text-[11px] font-medium', avail.className)}>{avail.label}</p>
        <Link
          href={`/contractor/rewards/catalogue/${gift.id}`}
          className={cn(
            'mt-auto flex h-8 items-center justify-center rounded-md text-[13px] font-semibold transition-colors',
            affordable && inStock
              ? 'bg-brand-strong text-white hover:bg-brand'
              : 'border border-border bg-white text-ink-muted hover:text-ink',
          )}
          aria-label={`${affordable && inStock ? 'Redeem' : 'View'} ${gift.name}`}
        >
          {affordable && inStock ? 'Redeem' : 'View details'}
        </Link>
      </div>
    </article>
  )
}
