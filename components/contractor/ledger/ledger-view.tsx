'use client'

import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, HandCoins, Landmark, Wallet } from 'lucide-react'
import { formatINR } from '@/lib/format'
import type { LedgerEntry, LedgerEntryType } from '@/lib/types'
import { StatCard } from '@/components/contractor/shared/stat-card'
import { FilterChips } from '@/components/contractor/shared/filter-chips'
import { SectionTitle } from '@/components/contractor/shared/section-title'
import { EmptyState } from '@/components/contractor/shared/empty-state'
import { TransactionCard } from './transaction-card'

type Filter = 'all' | LedgerEntryType

const options: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'credit', label: 'Credit' },
  { value: 'debit', label: 'Debit' },
  { value: 'udhar', label: 'Udhar' },
  { value: 'advance', label: 'Advance' },
]

const total = (entries: LedgerEntry[], type: LedgerEntryType) => entries.filter((e) => e.type === type).reduce((a, e) => a + e.amount, 0)

export function LedgerView({ openingBalance, entries }: { openingBalance: number; entries: LedgerEntry[] }) {
  const [filter, setFilter] = useState<Filter>('all')
  const credit = total(entries, 'credit')
  const debit = total(entries, 'debit')
  const udhar = total(entries, 'udhar')
  const advance = total(entries, 'advance')
  const current = openingBalance + credit + advance - debit - udhar
  const items = entries.filter((e) => filter === 'all' || e.type === filter)

  return (
    <main className="flex flex-col gap-4 p-4">
      <section className="rounded-xl bg-gradient-to-br from-navy to-navy-2 p-4 text-white" aria-label="Current balance">
        <p className="text-xs text-white/70">Current Balance</p>
        <p className="text-[26px] font-extrabold tracking-tight">{formatINR(current)}</p>
        <p className="mt-1 text-xs text-white/70">Opening balance {formatINR(openingBalance)}</p>
      </section>

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Credit" value={formatINR(credit)} icon={ArrowDownLeft} tone="success" />
        <StatCard label="Debit" value={formatINR(debit)} icon={ArrowUpRight} tone="danger" />
        <StatCard label="Udhar (Credit taken)" value={formatINR(udhar)} icon={HandCoins} tone="warn" />
        <StatCard label="Advance" value={formatINR(advance)} icon={Wallet} tone="info" />
      </div>

      <FilterChips label="Filter transactions" value={filter} options={options} onChange={setFilter} />

      <section>
        <SectionTitle action={<Landmark className="size-4 text-ink-muted" aria-hidden="true" />}>Transactions</SectionTitle>
        {items.length === 0 ? (
          <EmptyState title="No transactions" description={entries.length === 0 ? 'Entries added by the store will appear here.' : undefined} />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {items.map((e) => (
              <li key={e.id}>
                <TransactionCard entry={e} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
