import {
  BarChart3,
  Bell,
  ClipboardList,
  Coins,
  Gift,
  LayoutGrid,
  Megaphone,
  Package,
  PackageCheck,
  ScrollText,
  Settings2,
  ShoppingCart,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'

export const REWARDS_BASE = '/admin/rewards-engine'

export type RewardSection = {
  slug: string
  label: string
  description: string
  icon: LucideIcon
  legacyTab: string
}

export const REWARD_SECTIONS: RewardSection[] = [
  { slug: 'overview', label: 'Overview', legacyTab: 'overview', icon: LayoutGrid, description: 'Manage reward rules, points, tokens, gifts, and contractor reward programmes.' },
  { slug: 'rules', label: 'Reward Rules', legacyTab: 'rules', icon: ScrollText, description: 'Define how contractors earn points and tokens from referred sales.' },
  { slug: 'activities', label: 'Sales', legacyTab: 'activities', icon: ClipboardList, description: 'Add, approve, and review contractor referred sales.' },
  { slug: 'points-tokens', label: 'Points & Tokens', legacyTab: 'points', icon: Coins, description: 'Contractor balances, manual adjustments, and the reward ledger.' },
  { slug: 'catalogue', label: 'Product Catalogue', legacyTab: 'catalogue', icon: Package, description: 'Product categories and products shown in the contractor app, and used to auto-fill sales and rules.' },
  { slug: 'cart-requests', label: 'Cart Requests', legacyTab: 'cart-requests', icon: ShoppingCart, description: 'Products contractors added to their cart and sent to the store.' },
  { slug: 'gifts', label: 'Gift Catalogue', legacyTab: 'gifts', icon: Gift, description: 'Gifts contractors can claim with their points and tokens.' },
  { slug: 'redemptions', label: 'Redemption Requests', legacyTab: 'redemptions', icon: PackageCheck, description: 'Process gift claims from request through to handover.' },
  { slug: 'offers', label: 'Offers & Schemes', legacyTab: 'offers', icon: Megaphone, description: 'Time-bound promotions and reward schemes for contractors.' },
  { slug: 'app-content', label: 'App Content Control', legacyTab: 'content', icon: Smartphone, description: 'Banners, announcements, and content shown in the contractor app.' },
  { slug: 'notifications', label: 'Notifications', legacyTab: 'notifications', icon: Bell, description: 'Send broadcasts and review notifications delivered to contractors.' },
  { slug: 'reports', label: 'Reports & History', legacyTab: 'reports', icon: BarChart3, description: 'Exportable history of rewards, claims, and contractor activity.' },
  { slug: 'configuration', label: 'Configuration', legacyTab: 'configuration', icon: Settings2, description: 'Programme-wide settings for the rewards engine.' },
]

export const rewardHref = (slug: string, params?: Record<string, string | undefined>) => {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params ?? {})) if (v) qs.set(k, v)
  const s = qs.toString()
  return `${REWARDS_BASE}/${slug}${s ? `?${s}` : ''}`
}

export const findRewardSection = (slug: string) => REWARD_SECTIONS.find((s) => s.slug === slug)
