'use client'

import { useState } from 'react'
import type { Offer, OfferState, SchemeTarget } from '@/lib/types'
import { FilterChips } from '@/components/contractor/shared/filter-chips'
import { SectionTitle } from '@/components/contractor/shared/section-title'
import { EmptyState } from '@/components/contractor/shared/empty-state'
import { OfferCard } from './offer-card'
import { SchemeProgressCard } from './scheme-progress-card'

type Filter = 'all' | OfferState

const options: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'upcoming', label: 'Upcoming' },
]

export function OffersView({ offers, targets }: { offers: Offer[]; targets: SchemeTarget[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const list = offers.filter((o) => filter === 'all' || o.state === filter)
  const multipliers = offers.filter((o) => o.multiplier)

  return (
    <main className="flex flex-col gap-5 p-4">
      {targets.length > 0 && (
        <section>
          <SectionTitle>Contractor Targets</SectionTitle>
          <div className="flex flex-col gap-2.5">
            {targets.map((t) => (
              <SchemeProgressCard key={t.id} target={t} />
            ))}
          </div>
        </section>
      )}

      {multipliers.length > 0 && (
      <section>
        <SectionTitle>Reward Multipliers</SectionTitle>
        <ul className="grid grid-cols-2 gap-2.5">
          {multipliers.map((o) => (
            <li key={o.id} className="rounded-xl bg-white p-3 shadow-[0_1px_3px_rgba(28,35,64,0.08)]">
              <p className="text-[22px] font-extrabold text-warn">{o.multiplier}x</p>
              <p className="text-[12px] leading-snug font-medium text-ink">{o.title}</p>
            </li>
          ))}
        </ul>
      </section>
      )}

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Offers & Schemes</SectionTitle>
        <FilterChips label="Filter offers" value={filter} options={options} onChange={setFilter} />
        {list.length === 0 ? (
          <EmptyState
            title={offers.length === 0 ? 'No offers right now' : 'No offers here'}
            description={offers.length === 0 ? 'New offers from the store will appear here.' : undefined}
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {list.map((o) => (
              <li key={o.id}>
                <OfferCard offer={o} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
