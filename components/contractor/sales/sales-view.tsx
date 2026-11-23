'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Clock, Search, TrendingUp, XCircle } from 'lucide-react'
import { formatDate, formatINR } from '@/lib/format'
import { useContractor } from '@/components/contractor/contractor-store'
import type { ApprovalStatus, SaleRecord } from '@/lib/types'
import { StatCard } from '@/components/contractor/shared/stat-card'
import { FilterChips } from '@/components/contractor/shared/filter-chips'
import { StatusPill } from '@/components/contractor/shared/status-pill'
import { EmptyState } from '@/components/contractor/shared/empty-state'
import { SectionTitle } from '@/components/contractor/shared/section-title'

type StatusFilter = 'all' | ApprovalStatus

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'rejected', label: 'Rejected' },
]

const sumBy = (records: SaleRecord[], status?: ApprovalStatus) =>
  records.filter((r) => !status || r.status === status).reduce((acc, r) => acc + r.amount, 0)

export function SalesView({ records }: { records: SaleRecord[] }) {
  const { formatPts } = useContractor()
  const [status, setStatus] = useState<StatusFilter>('all')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return records.filter(
      (r) =>
        (status === 'all' || r.status === status) &&
        (!q || [r.reference, r.customer, r.product].some((f) => f.toLowerCase().includes(q))),
    )
  }, [records, status, query])

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Total Referred" value={formatINR(sumBy(records))} icon={TrendingUp} tone="brand" />
        <StatCard label="Approved" value={formatINR(sumBy(records, 'approved'))} icon={CheckCircle2} tone="success" />
        <StatCard label="Pending" value={formatINR(sumBy(records, 'pending'))} icon={Clock} tone="warn" />
        <StatCard label="Rejected" value={formatINR(sumBy(records, 'rejected'))} icon={XCircle} tone="danger" />
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
        <label htmlFor="sales-search" className="sr-only">
          Search sales
        </label>
        <input
          id="sales-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customer, product or reference"
          className="h-10 w-full rounded-lg border border-border bg-white pr-3 pl-9 text-sm text-ink placeholder:text-ink-muted/80 focus-visible:outline-2 focus-visible:outline-brand"
        />
      </div>

      <FilterChips label="Filter by status" value={status} options={statusOptions} onChange={setStatus} />

      <section>
        <SectionTitle>Sales History</SectionTitle>
        {filtered.length === 0 ? (
          <EmptyState
            title={records.length === 0 ? 'No sales yet' : 'No sales found'}
            description={records.length === 0 ? 'Sales recorded by the store will appear here.' : 'Try changing the search or status filter.'}
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {filtered.map((r) => (
              <li key={r.id} className="rounded-xl bg-white p-3.5 shadow-[0_1px_3px_rgba(28,35,64,0.08)]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{r.customer}</p>
                    <p className="text-[11px] text-ink-muted">
                      {r.reference} · {formatDate(r.date)}
                    </p>
                  </div>
                  <StatusPill status={r.status} />
                </div>
                <p className="mt-2 text-[13px] font-medium text-ink">
                  {r.product}
                  {r.quantity && <span className="font-normal text-ink-muted"> · {r.quantity}</span>}
                </p>
                {r.description && <p className="mt-0.5 text-[12px] leading-snug whitespace-pre-line text-ink-muted">{r.description}</p>}
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                  <p className="text-[15px] font-bold text-ink">{formatINR(r.amount)}</p>
                  <p className="text-[12px] font-semibold text-brand">
                    {r.reward > 0 ? (r.status === 'pending' ? `${formatPts(r.reward)} on approval` : `+${formatPts(r.reward)}`) : 'No reward'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
