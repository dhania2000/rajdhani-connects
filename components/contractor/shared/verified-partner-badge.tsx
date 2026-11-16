import { Star } from 'lucide-react'

export function VerifiedPartnerBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f3d677] bg-gold-soft py-0.5 pr-2.5 pl-1 text-[12px] font-semibold text-[#5a4300]">
      <span className="flex size-4 items-center justify-center rounded-full bg-warn" aria-hidden="true">
        <Star className="size-2.5 text-white" fill="currentColor" strokeWidth={0} />
      </span>
      Verified Partner
    </span>
  )
}
