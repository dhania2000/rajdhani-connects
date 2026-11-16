'use client'

import Image from 'next/image'
import { useContractor } from '@/components/contractor/contractor-store'
import { VerifiedPartnerBadge } from '@/components/contractor/shared/verified-partner-badge'

export function ContractorWelcomeCard() {
  const { profile } = useContractor()

  return (
    <section aria-label="Contractor" className="flex items-center gap-3.5 bg-white px-4 py-3.5">
      <div className="relative size-[60px] shrink-0 overflow-hidden rounded-full bg-[#dbe7f7] ring-2 ring-white shadow-[0_1px_4px_rgba(28,35,64,0.15)]">
        <Image src={profile.avatarUrl} alt={`${profile.name} profile photo`} fill sizes="60px" className="object-cover" priority />
      </div>
      <div className="min-w-0">
        <p className="text-[14px] leading-tight text-ink">Welcome,</p>
        <p className="truncate text-[20px] leading-snug font-bold text-ink">{profile.name}</p>
        {profile.verified && (
          <div className="mt-1">
            <VerifiedPartnerBadge />
          </div>
        )}
      </div>
    </section>
  )
}
