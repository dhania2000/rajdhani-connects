import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { formatDate, formatNumber } from '@/lib/format'
import type { RewardTransaction } from '@/lib/types'
import { StatusPill } from '@/components/contractor/shared/status-pill'
import { cn } from '@/lib/utils'

export function RewardHistoryCard({ transaction: t }: { transaction: RewardTransaction }) {
  const isRedeem = t.status === 'redeemed'
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3.5 shadow-[0_1px_3px_rgba(28,35,64,0.08)]">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full',
          isRedeem ? 'bg-lavender text-brand' : 'bg-success/10 text-success',
        )}
        aria-hidden="true"
      >
        {isRedeem ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{t.product}</p>
        <p className="truncate text-[11px] text-ink-muted">
          {t.invoiceRef} · {formatDate(t.date)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className={cn('text-sm font-bold', isRedeem ? 'text-ink' : 'text-success')}>
          {isRedeem ? '−' : '+'}
          {formatNumber(t.points)} pts
        </p>
        <StatusPill status={t.status} />
      </div>
    </div>
  )
}
