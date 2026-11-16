'use client'

import { useState } from 'react'
import { Gift, ShoppingCart } from 'lucide-react'
import { formatINR } from '@/lib/format'
import { getCustomRangePerformance, performanceByPeriod, performancePeriodOptions } from '@/lib/mock-data'
import type { PerformancePeriod } from '@/lib/types'
import { FilterDropdown } from '@/components/contractor/shared/filter-dropdown'

const today = '2026-11-16'

export function PerformanceCard() {
  const [period, setPeriod] = useState<PerformancePeriod>('month')
  const [from, setFrom] = useState('2026-11-01')
  const [to, setTo] = useState(today)

  const metrics = period === 'custom' ? getCustomRangePerformance(from, to) : performanceByPeriod[period]

  return (
    <section aria-labelledby="performance-title">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 id="performance-title" className="text-[16px] font-bold text-ink">
          My Performance
        </h2>
        <FilterDropdown label="Performance period" value={period} options={performancePeriodOptions} onChange={setPeriod} className="w-[132px]" />
      </div>

      {period === 'custom' && (
        <div className="mb-2.5 grid grid-cols-2 gap-2">
          <label className="text-[11px] font-medium text-ink-muted">
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => e.target.value && setFrom(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-[13px] text-ink"
            />
          </label>
          <label className="text-[11px] font-medium text-ink-muted">
            To
            <input
              type="date"
              value={to}
              min={from}
              max={today}
              onChange={(e) => e.target.value && setTo(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-[13px] text-ink"
            />
          </label>
        </div>
      )}

      <div className="grid grid-cols-2 divide-x divide-border rounded-xl bg-white py-3.5 shadow-[0_1px_4px_rgba(28,35,64,0.08)]" aria-live="polite">
        <Metric icon={<ShoppingCart className="size-[18px]" />} tone="bg-success/10 text-success" value={formatINR(metrics.salesBrought)} label="Sales Brought" />
        <Metric icon={<Gift className="size-[18px]" />} tone="bg-lavender text-brand" value={formatINR(metrics.rewardsEarned)} label="Rewards Earned" />
      </div>
    </section>
  )
}

function Metric({ icon, tone, value, label }: { icon: React.ReactNode; tone: string; value: string; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-3 max-[360px]:gap-1.5 max-[360px]:px-2">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg max-[360px]:size-7 ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[17px] leading-tight font-bold whitespace-nowrap text-ink max-[360px]:text-[14px]">{value}</p>
        <p className="text-[12px] whitespace-nowrap text-ink-muted max-[360px]:text-[11px]">{label}</p>
      </div>
    </div>
  )
}
