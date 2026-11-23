import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: string; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-strong">{eyebrow}</p> : null}
        <h1 className="text-balance text-[22px] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-pretty text-sm leading-relaxed text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}

export function Panel({ title, description, actions, children, className }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('min-w-0 rounded-[14px] border border-border bg-white p-4 shadow-[0_1px_2px_rgba(24,33,63,0.04)] sm:p-5', className)}>
      {title ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-pretty text-[13px] leading-relaxed text-ink-muted">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function StatCard({ label, value, icon: Icon, tone = 'brand', hint }: { label: string; value: string | number; icon: LucideIcon; tone?: 'brand' | 'green' | 'amber' | 'red' | 'gold'; hint?: string }) {
  const tones = {
    brand: 'bg-brand/[0.08] text-brand',
    green: 'bg-success/10 text-success',
    amber: 'bg-warn/10 text-warn',
    red: 'bg-danger/10 text-danger',
    gold: 'bg-gold/15 text-gold-strong',
  }
  return (
    <div className="flex min-h-[124px] flex-col justify-between gap-4 rounded-[14px] border border-border bg-white p-5 shadow-[0_1px_2px_rgba(24,33,63,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(24,33,63,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-muted">{label}</p>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[26px] font-semibold leading-none tracking-tight tabular-nums text-ink">{value}</p>
        {hint ? <p className="mt-2 text-xs text-ink-muted">{hint}</p> : null}
      </div>
    </div>
  )
}

const STATUS_TONES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  verified: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  pending: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  pending_approval: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  submitted: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  requested: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  under_review: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  draft: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  ready_for_handover: 'bg-brand/10 text-brand ring-brand/20',
  suspended: 'bg-red-50 text-red-700 ring-red-600/20',
  rejected: 'bg-red-50 text-red-700 ring-red-600/20',
  reversed: 'bg-red-50 text-red-700 ring-red-600/20',
  cancelled: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  inactive: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  archived: 'bg-slate-100 text-slate-700 ring-slate-500/20',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset', STATUS_TONES[status] ?? STATUS_TONES.draft)}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p> : null}
    </div>
  )
}

export function DataTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="max-w-full overflow-x-auto rounded-[10px] border border-border">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead className="border-b border-border bg-[#f9fafc] text-[11px] uppercase tracking-[0.08em] text-ink-muted">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap px-4 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border [&>tr]:transition-colors [&>tr:hover]:bg-[#fafbfd]">{children}</tbody>
      </table>
    </div>
  )
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 align-top text-ink', className)}>{children}</td>
}

export const fmtNumber = (n: number | string | null | undefined) => Number(n ?? 0).toLocaleString('en-IN')
export const fmtCurrency = (n: number | string | null | undefined) => `\u20B9${Number(n ?? 0).toLocaleString('en-IN')}`
export const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '\u2014'
export const toInputDate = (d: string | Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : '')
