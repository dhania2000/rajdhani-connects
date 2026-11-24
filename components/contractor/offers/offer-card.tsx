'use client'

import { CalendarDays, Gift, Star, Target, Zap } from 'lucide-react'
import { formatDate, formatINR, formatNumber } from '@/lib/format'
import type { Offer } from '@/lib/types'
import { useContractor } from '@/components/contractor/contractor-store'
import { StatusPill } from '@/components/contractor/shared/status-pill'

const DAY = 86_400_000

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY)
}

export function OfferCard({ offer }: { offer: Offer }) {
  const { formatPts, content } = useContractor()
  const today = new Date().toISOString().slice(0, 10)

  const reward = (() => {
    switch (offer.rewardType) {
      case 'points':
        return offer.rewardValue ? `${formatPts(offer.rewardValue)}` : null
      case 'tokens':
        return offer.rewardValue ? `${formatNumber(offer.rewardValue)} ${content.tokensLabel}` : null
      case 'multiplier':
        return offer.multiplier ? `${offer.multiplier}x points` : null
      case 'gift':
        return 'Gift'
      default:
        return null
    }
  })()

  const fmtTarget = (v: number) => {
    if (!offer.target) return formatNumber(v)
    switch (offer.target.unit) {
      case 'amount':
        return formatINR(v)
      case 'points':
        return formatPts(v)
      case 'tokens':
        return `${formatNumber(v)} ${content.tokensLabel}`
      default:
        return `${formatNumber(v)} units`
    }
  }
  const targetLabel = offer.target ? { amount: 'Sales target', points: 'Points target', tokens: 'Tokens target', quantity: 'Quantity target' }[offer.target.unit] : ''

  const current = offer.target?.current
  const pct = offer.target && current !== undefined ? Math.min(100, Math.round((current / offer.target.value) * 100)) : null
  const remaining = offer.target && current !== undefined ? Math.max(0, offer.target.value - current) : null

  const timing =
    offer.state === 'upcoming'
      ? `Starts in ${Math.max(1, daysBetween(today, offer.startDate))} day(s)`
      : (() => {
          const left = daysBetween(today, offer.validTill)
          return left <= 0 ? 'Ends today' : `${left} day${left === 1 ? '' : 's'} left`
        })()

  return (
    <article className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(28,35,64,0.08)]">
      {offer.bannerUrl && <img src={offer.bannerUrl} alt="" className="aspect-[2/1] w-full object-cover" />}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            {offer.featured && <Star className="size-3.5 shrink-0 fill-warn text-warn" aria-label="Featured" />}
            {offer.title}
          </h3>
          <StatusPill status={offer.state} className="shrink-0" />
        </div>
        {offer.description && <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-line text-ink-muted">{offer.description}</p>}

        {(reward || offer.target) && (
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {offer.target && (
              <div className="rounded-lg bg-app-bg px-3 py-2">
                <dt className="flex items-center gap-1 text-[11px] text-ink-muted">
                  <Target className="size-3" aria-hidden="true" />
                  {targetLabel}
                </dt>
                <dd className="text-[14px] font-bold text-ink">{fmtTarget(offer.target.value)}</dd>
              </div>
            )}
            {reward && (
              <div className="rounded-lg bg-lavender px-3 py-2">
                <dt className="flex items-center gap-1 text-[11px] text-ink-muted">
                  {offer.rewardType === 'multiplier' ? <Zap className="size-3" aria-hidden="true" /> : <Gift className="size-3" aria-hidden="true" />}
                  Reward
                </dt>
                <dd className="text-[14px] font-bold text-brand">{reward}</dd>
              </div>
            )}
          </dl>
        )}

        {offer.target && pct !== null && current !== undefined && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-ink-muted">
              <span>
                Your progress: <span className="font-semibold text-ink">{fmtTarget(current)}</span>
              </span>
              <span>{pct}%</span>
            </div>
            <div
              className="mt-1 h-2 overflow-hidden rounded-full bg-app-bg"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-label={`${offer.title} progress`}
            >
              <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-ink-muted">
              {remaining === 0 ? 'Target reached!' : `${fmtTarget(remaining ?? 0)} more needed`}
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5 text-[12px]">
          <span className="inline-flex items-center gap-1 text-ink-muted">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {formatDate(offer.startDate)} – {formatDate(offer.validTill)}
          </span>
          <span className={offer.state === 'expiring' ? 'font-semibold text-[#b45309]' : 'text-ink-muted'}>{timing}</span>
        </div>

        {offer.terms && (
          <details className="mt-2 text-[12px] text-ink-muted">
            <summary className="cursor-pointer font-medium text-ink">Terms & conditions</summary>
            <p className="mt-1 whitespace-pre-line">{offer.terms}</p>
          </details>
        )}
      </div>
    </article>
  )
}
