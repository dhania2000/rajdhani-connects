'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { useContractor } from '@/components/contractor/contractor-store'
import { GiftBoxIcon } from '@/components/contractor/shared/gift-box-icon'

export function RewardBalanceCard() {
  const { availablePoints, content, formatPts } = useContractor()

  return (
    <section
      aria-label={content.rewardCardTitle}
      className="relative flex items-center gap-3 overflow-hidden rounded-xl border border-[#cfc0f5] bg-gradient-to-br from-[#efe4ff] via-[#f3ebff] to-[#e9defc] px-4 py-3.5 max-[340px]:gap-2 max-[340px]:px-3"
    >
      <GiftBoxIcon className="size-[52px] shrink-0 max-[340px]:size-11" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-ink">{content.rewardCardTitle}</p>
        <p className="text-[26px] leading-tight font-extrabold tracking-tight text-ink">{formatPts(availablePoints)}</p>
        <div className="flex items-end justify-between gap-2">
          <p className="text-[12px] whitespace-nowrap text-ink-muted max-[340px]:text-[11px]">(Available Value)</p>
          <Link
            href="/contractor/rewards/catalogue?filter=redeemable"
            className="-mt-3 inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand-strong pr-2.5 pl-3.5 text-[13px] max-[340px]:pl-2.5 max-[340px]:text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {content.redeemButtonText}
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
