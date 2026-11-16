import { ArrowDownLeft, ArrowUpRight, HandCoins, Wallet } from 'lucide-react'
import { formatDate, formatINR } from '@/lib/format'
import type { LedgerEntry, LedgerEntryType } from '@/lib/types'
import { cn } from '@/lib/utils'

const meta: Record<LedgerEntryType, { label: string; icon: typeof Wallet; className: string; sign: string }> = {
  credit: { label: 'Credit', icon: ArrowDownLeft, className: 'bg-success/10 text-success', sign: '+' },
  debit: { label: 'Debit', icon: ArrowUpRight, className: 'bg-danger/10 text-danger', sign: '−' },
  udhar: { label: 'Udhar', icon: HandCoins, className: 'bg-warn/15 text-[#b45309]', sign: '−' },
  advance: { label: 'Advance', icon: Wallet, className: 'bg-info/10 text-info', sign: '+' },
}

export function TransactionCard({ entry }: { entry: LedgerEntry }) {
  const m = meta[entry.type]
  const Icon = m.icon
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white p-3.5 shadow-[0_1px_3px_rgba(28,35,64,0.08)]">
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', m.className)} aria-hidden="true">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{entry.description}</p>
        <p className="text-[11px] text-ink-muted">
          {m.label} · {formatDate(entry.date)}
        </p>
      </div>
      <p className={cn('shrink-0 text-sm font-bold', m.sign === '+' ? 'text-success' : 'text-ink')}>
        {m.sign}
        {formatINR(entry.amount)}
      </p>
    </div>
  )
}
