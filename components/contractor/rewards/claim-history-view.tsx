'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { formatDate } from '@/lib/format'
import type { ClaimStatus } from '@/lib/types'
import { useContractor } from '@/components/contractor/contractor-store'
import { EmptyState } from '@/components/contractor/shared/empty-state'
import { StatusPill } from '@/components/contractor/shared/status-pill'
import { cn } from '@/lib/utils'

const steps: { key: ClaimStatus; label: string }[] = [
  { key: 'requested', label: 'Requested' },
  { key: 'approved', label: 'Approved' },
  { key: 'delivered', label: 'Delivered' },
]

export function ClaimHistoryView() {
  const { claims, formatPts } = useContractor()

  if (claims.length === 0) {
    return (
      <main className="p-4">
        <EmptyState
          title="No claims yet"
          description="Redeem a gift to see it here."
          action={
            <Link href="/contractor/rewards/catalogue" className="inline-flex h-10 items-center rounded-lg bg-brand-strong px-4 text-sm font-semibold text-white">
              Browse Gifts
            </Link>
          }
        />
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-3 p-4">
      <ul className="flex flex-col gap-3">
        {claims.map((c) => {
          const current = steps.findIndex((s) => s.key === c.status)
          return (
            <li key={c.id} className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(28,35,64,0.08)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-ink">{c.giftName}</p>
                  <p className="text-[11px] text-ink-muted">
                    {c.id} · {formatDate(c.requestedOn)} · {formatPts(c.points)}
                  </p>
                </div>
                <StatusPill status={c.status} />
              </div>

              {c.status === 'rejected' ? (
                <p className="mt-3 rounded-lg bg-danger/10 p-3 text-[13px] text-[#b42318]">
                  This request was not approved. Reserved points have been returned to your balance.
                </p>
              ) : (
              <ol className="mt-4 flex items-center" aria-label="Claim progress">
                {steps.map((s, i) => (
                  <li key={s.key} className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}>
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={cn(
                          'flex size-6 items-center justify-center rounded-full text-[11px] font-bold',
                          i <= current ? 'bg-brand text-white' : 'bg-muted text-ink-muted',
                        )}
                        aria-current={i === current ? 'step' : undefined}
                      >
                        {i < current ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
                      </span>
                      <span className={cn('text-[11px]', i <= current ? 'font-semibold text-ink' : 'text-ink-muted')}>{s.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                      <span className={cn('mx-1 mb-4 h-0.5 flex-1 rounded', i < current ? 'bg-brand' : 'bg-muted')} aria-hidden="true" />
                    )}
                  </li>
                ))}
              </ol>
              )}


            </li>
          )
        })}
      </ul>
    </main>
  )
}
