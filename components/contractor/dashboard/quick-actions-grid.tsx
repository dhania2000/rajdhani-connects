'use client'

import { FileText, Gift, Hammer, Landmark, Users } from 'lucide-react'
import { useContractor } from '@/components/contractor/contractor-store'
import { QuickActionCard, type QuickAction } from './quick-action-card'

type TileKey = 'sales' | 'rewards' | 'claim' | 'catalogue' | 'offers' | 'ledger'

const TILE_STYLE: Record<TileKey, Omit<QuickAction, 'title' | 'subtitle'>> = {
  sales: { href: '/contractor/sales', icon: Users, color: '#11B981' },
  rewards: { href: '/contractor/rewards', icon: Gift, color: '#F59E0B' },
  claim: { href: '/contractor/rewards/catalogue', icon: Gift, color: '#A855F7' },
  catalogue: { href: '/contractor/catalogue', icon: FileText, color: '#1976F3' },
  offers: { href: '/contractor/offers', icon: Hammer, color: '#F59E0B' },
  ledger: { href: '/contractor/ledger', icon: Landmark, color: '#0EA5E9' },
}

/** Tile labels, subtitles and visibility are set by admins in Rewards Engine > App content. */
export function QuickActionsGrid() {
  const { content } = useContractor()
  const actions = content.quickActions.filter((q) => q.visible && q.key in TILE_STYLE)
  if (actions.length === 0) return null

  return (
    <nav aria-label="Quick actions">
      <ul className="grid grid-cols-3 gap-2.5 max-[340px]:gap-2">
        {actions.map((q) => (
          <li key={q.key} className="contents">
            <QuickActionCard {...TILE_STYLE[q.key as TileKey]} title={q.title} subtitle={q.subtitle || undefined} />
          </li>
        ))}
      </ul>
    </nav>
  )
}
