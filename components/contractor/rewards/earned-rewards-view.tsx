'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Clock, Gift, Trophy, Wallet } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import type { RewardSummary, RewardTransaction } from '@/lib/types'
import { useContractor } from '@/components/contractor/contractor-store'
import { StatCard } from '@/components/contractor/shared/stat-card'
import { FilterChips } from '@/components/contractor/shared/filter-chips'
import { EmptyState } from '@/components/contractor/shared/empty-state'
import { SectionTitle } from '@/components/contractor/shared/section-title'
import { RewardHistoryCard } from './reward-history-card'

type Filter = 'all' | RewardTransaction['status']

const options: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'credited', label: 'Credited' },
  { value: 'pending', label: 'Pending' },
  { value: 'redeemed', label: 'Redeemed' },
]

export function EarnedRewardsView({ summary, transactions }: { summary: RewardSummary; transactions: RewardTransaction[] }) {
  const { availablePoints, claims, formatPts } = useContractor()
  const [filter, setFilter] = useState<Filter>('all')
  const items = transactions.filter((t) => filter === 'all' || t.status === filter)

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Total Earned" value={formatPts(summary.totalEarned)} icon={Trophy} tone="brand" />
        <StatCard label="Available Balance" value={formatPts(availablePoints)} icon={Wallet} tone="success" />
        <StatCard label="Pending Rewards" value={formatPts(summary.pending)} icon={Clock} tone="warn" />
        <StatCard label="Redeemed" value={formatPts(summary.redeemed)} icon={Gift} tone="info" />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/contractor/rewards/catalogue"
          className="flex h-11 items-center justify-center gap-1 rounded-lg bg-brand-strong text-sm font-semibold text-white hover:bg-brand"
        >
          Redeem Gifts <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
        <Link
          href="/contractor/rewards/claims"
          className="flex h-11 items-center justify-center gap-1 rounded-lg border border-brand/30 bg-white text-sm font-semibold text-brand hover:bg-lavender"
        >
          Claim History ({formatNumber(claims.length)})
        </Link>
      </div>

      <FilterChips label="Filter rewards" value={filter} options={options} onChange={setFilter} />

      <section>
        <SectionTitle>Transaction History</SectionTitle>
        {items.length === 0 ? (
          <EmptyState title="No transactions" description="Nothing matches this filter yet." />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {items.map((t) => (
              <li key={t.id}>
                <RewardHistoryCard transaction={t} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
