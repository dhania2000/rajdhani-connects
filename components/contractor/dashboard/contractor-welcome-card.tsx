'use client'

import { useContractor } from '@/components/contractor/contractor-store'
import { ContractorAvatar } from '@/components/contractor/shared/contractor-avatar'
import { VerifiedPartnerBadge } from '@/components/contractor/shared/verified-partner-badge'
import { Trophy } from 'lucide-react'

export function ContractorWelcomeCard() {
  const { profile, content, ranking, formatPts } = useContractor()

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
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {profile.verified && <VerifiedPartnerBadge />}
          {ranking.earned > 0 ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900"
              title={`${formatPts(ranking.earned)} earned to date`}
            >
              <Trophy className="size-3" aria-hidden="true" />
              Rank #{ranking.rank}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-app-bg px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
              <Trophy className="size-3" aria-hidden="true" />
              Earn points to get ranked
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
