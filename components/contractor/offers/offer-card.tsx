import { CalendarDays, Zap } from 'lucide-react'
import { formatDate } from '@/lib/format'
import type { Offer } from '@/lib/types'
import { StatusPill } from '@/components/contractor/shared/status-pill'

export function OfferCard({ offer }: { offer: Offer }) {
  return (
    <article className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(28,35,64,0.08)]">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{offer.title}</h3>
        <StatusPill status={offer.state} className="shrink-0" />
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{offer.description}</p>
      <div className="mt-2.5 flex items-center gap-3 text-[12px]">
        <span className="inline-flex items-center gap-1 text-ink-muted">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {offer.state === 'upcoming' ? 'Runs till ' : 'Valid till '}
          {formatDate(offer.validTill)}
        </span>
        {offer.multiplier && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warn/15 px-2 py-0.5 font-semibold text-[#92400e]">
            <Zap className="size-3" aria-hidden="true" />
            {offer.multiplier}x points
          </span>
        )}
      </div>
    </article>
  )
}
