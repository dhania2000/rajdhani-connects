'use client'

import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { gifts } from '@/lib/mock-data'
import { formatPoints } from '@/lib/format'
import { useContractor } from '@/components/contractor/contractor-store'
import { FilterChips } from '@/components/contractor/shared/filter-chips'
import { EmptyState } from '@/components/contractor/shared/empty-state'
import { GiftCard } from './gift-card'

type Filter = 'all' | 'redeemable'

const options: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All Gifts' },
  { value: 'redeemable', label: 'Redeemable Now' },
]

export function GiftCatalogueView({ initialFilter }: { initialFilter: Filter }) {
  const { availablePoints } = useContractor()
  const [filter, setFilter] = useState<Filter>(initialFilter)

  const list = gifts.filter(
    (g) => filter === 'all' || (g.points <= availablePoints && g.availability !== 'out-of-stock'),
  )

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3 rounded-xl border border-[#cfc0f5] bg-gradient-to-br from-[#efe4ff] to-[#e9defc] px-4 py-3">
        <Wallet className="size-5 text-brand" aria-hidden="true" />
        <p className="text-sm text-ink">
          Available balance: <span className="font-bold">{formatPoints(availablePoints)}</span>
        </p>
      </div>

      <FilterChips label="Filter gifts" value={filter} options={options} onChange={setFilter} />

      {list.length === 0 ? (
        <EmptyState title="No redeemable gifts yet" description="Refer more sales to unlock gifts." />
      ) : (
        <ul className="grid grid-cols-2 gap-2.5">
          {list.map((g) => (
            <li key={g.id} className="contents">
              <GiftCard gift={g} availablePoints={availablePoints} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
