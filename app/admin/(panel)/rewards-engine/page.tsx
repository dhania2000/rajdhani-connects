import Link from 'next/link'
import { PageHeader } from '@/components/admin/ui'
import { OverviewTab } from '@/components/admin/rewards/overview-tab'
import { RulesTab } from '@/components/admin/rewards/rules-tab'
import { ActivitiesTab } from '@/components/admin/rewards/activities-tab'
import { PointsTab } from '@/components/admin/rewards/points-tab'
import { GiftsTab } from '@/components/admin/rewards/gifts-tab'
import { RedemptionsTab } from '@/components/admin/rewards/redemptions-tab'
import { OffersTab } from '@/components/admin/rewards/offers-tab'
import { AppContentTab } from '@/components/admin/rewards/app-content-tab'
import { NotificationsTab } from '@/components/admin/rewards/notifications-tab'
import { ReportsTab } from '@/components/admin/rewards/reports-tab'
import { cn } from '@/lib/utils'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'rules', label: 'Reward Rules' },
  { value: 'activities', label: 'Reward Activities' },
  { value: 'points', label: 'Points & Tokens' },
  { value: 'gifts', label: 'Gift Catalogue' },
  { value: 'redemptions', label: 'Redemption Requests' },
  { value: 'offers', label: 'Offers & Schemes' },
  { value: 'content', label: 'App Content Control' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'reports', label: 'Reports & History' },
  { value: 'configuration', label: 'Configuration' },
] as const

type Tab = (typeof TABS)[number]['value']

export default async function RewardsEnginePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const tab: Tab = TABS.some((t) => t.value === sp.tab) ? (sp.tab as Tab) : 'overview'

  return (
    <>
      <PageHeader title="Rewards Engine" description="Rules, activities, ledger, gifts, claims, offers, and contractor app content." />

      <nav aria-label="Rewards Engine sections" className="-mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/rewards-engine?tab=${t.value}`}
            aria-current={tab === t.value ? 'page' : undefined}
            className={cn(
              'shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              tab === t.value ? 'border-brand text-brand' : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'rules' && <RulesTab />}
      {tab === 'activities' && <ActivitiesTab status={sp.status} q={sp.q} />}
      {tab === 'points' && <PointsTab />}
      {tab === 'gifts' && <GiftsTab />}
      {tab === 'redemptions' && <RedemptionsTab status={sp.status} />}
      {tab === 'offers' && <OffersTab />}
      {tab === 'content' && <AppContentTab section="content" />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'reports' && <ReportsTab report={sp.report} />}
      {tab === 'configuration' && <AppContentTab section="configuration" />}
    </>
  )
}
