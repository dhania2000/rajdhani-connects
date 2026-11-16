import { Target } from 'lucide-react'
import { formatINR, formatNumber } from '@/lib/format'
import type { SchemeTarget } from '@/lib/types'

export function SchemeProgressCard({ target }: { target: SchemeTarget }) {
  const pct = Math.min(100, Math.round((target.current / target.target) * 100))
  const remaining = Math.max(0, target.target - target.current)
  const fmt = (v: number) => (target.unit === '₹' ? formatINR(v) : `${formatNumber(v)} ${target.unit}`)

  return (
    <article className="rounded-xl border border-[#cfc0f5] bg-gradient-to-br from-[#efe4ff] to-[#f6f0ff] p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-white text-brand" aria-hidden="true">
          <Target className="size-4" />
        </span>
        <h3 className="text-sm font-bold text-ink">{target.title}</h3>
      </div>
      <p className="mt-2 text-[13px] text-ink">
        {target.unit === '₹' ? (
          <>
            <span className="font-bold text-brand">{formatINR(remaining)}</span> more needed.
          </>
        ) : (
          <>
            <span className="font-bold text-brand">{formatNumber(remaining)}</span> more {target.unit} needed.
          </>
        )}
      </p>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-white"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${target.title} progress`}
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-muted">
        <span>
          {fmt(target.current)} / {fmt(target.target)}
        </span>
        <span className="font-semibold">{pct}%</span>
      </div>
    </article>
  )
}
