'use client'

import { useContractor } from '@/components/contractor/contractor-store'
import { ContractorAvatar } from '@/components/contractor/shared/contractor-avatar'
import { VerifiedPartnerBadge } from '@/components/contractor/shared/verified-partner-badge'

export function ContractorWelcomeCard() {
  const { profile, content } = useContractor()

  return (
    <section aria-label="Contractor" className="flex items-center gap-3.5 bg-white px-4 py-3.5">
      <ContractorAvatar
        src={profile.avatarUrl}
        name={profile.name}
        sizes="60px"
        priority
        className="size-[60px] ring-2 ring-white shadow-[0_1px_4px_rgba(28,35,64,0.15)]"
        textClassName="text-lg"
      />
      <div className="min-w-0">
        {content.welcomeText && <p className="text-[14px] leading-tight text-ink">{content.welcomeText}</p>}
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
