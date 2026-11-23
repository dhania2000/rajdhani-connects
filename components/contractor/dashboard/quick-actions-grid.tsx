import { FileText, Gift, Hammer, Users } from 'lucide-react'
import { QuickActionCard, type QuickAction } from './quick-action-card'

const actions: QuickAction[] = [
  { href: '/contractor/sales', title: 'My Sales', subtitle: '(Referrals)', icon: Users, color: '#11B981' },
  { href: '/contractor/rewards', title: 'Earned\nRewards', icon: Gift, color: '#F59E0B' },
  { href: '/contractor/rewards/catalogue', title: 'Claim\nReward', icon: Gift, color: '#A855F7' },
  { href: '/contractor/catalogue', title: 'Product\nCatalogue', icon: FileText, color: '#1976F3' },
  { href: '/contractor/offers', title: 'Offers &\nSchemes', icon: Hammer, color: '#F59E0B' },
]

export function QuickActionsGrid() {
  return (
    <nav aria-label="Quick actions">
      <ul className="grid grid-cols-3 gap-2.5 max-[340px]:gap-2">
        {actions.map((a) => (
          <li key={a.href} className="contents">
            <QuickActionCard {...a} />
          </li>
        ))}
      </ul>
    </nav>
  )
}
