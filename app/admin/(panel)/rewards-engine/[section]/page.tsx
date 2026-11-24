import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/admin/ui'
import { OverviewTab } from '@/components/admin/rewards/overview-tab'
import { RulesTab } from '@/components/admin/rewards/rules-tab'
import { ActivitiesTab } from '@/components/admin/rewards/activities-tab'
import { PointsTab } from '@/components/admin/rewards/points-tab'
import { GiftsTab } from '@/components/admin/rewards/gifts-tab'
import { CatalogueTab } from '@/components/admin/rewards/catalogue-tab'
import { CartRequestsTab } from '@/components/admin/rewards/cart-requests-tab'
import { RedemptionsTab } from '@/components/admin/rewards/redemptions-tab'
import { OffersTab } from '@/components/admin/rewards/offers-tab'
import { AppContentTab } from '@/components/admin/rewards/app-content-tab'
import { NotificationsTab } from '@/components/admin/rewards/notifications-tab'
import { ReportsTab } from '@/components/admin/rewards/reports-tab'
import { findRewardSection } from '@/lib/admin-nav'

export default async function RewardsSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const [{ section: slug }, sp] = await Promise.all([params, searchParams])
  const section = findRewardSection(slug)
  if (!section) notFound()

  const isOverview = section.slug === 'overview'

  return (
    <>
      <PageHeader eyebrow={isOverview ? undefined : 'Rewards Engine'} title={isOverview ? 'Rewards Engine' : section.label} description={section.description} />

      {section.slug === 'overview' && <OverviewTab />}
      {section.slug === 'rules' && <RulesTab />}
      {section.slug === 'activities' && <ActivitiesTab status={sp.status} q={sp.q} />}
      {section.slug === 'points-tokens' && <PointsTab />}
      {section.slug === 'catalogue' && <CatalogueTab />}
      {section.slug === 'cart-requests' && <CartRequestsTab status={sp.status} />}
      {section.slug === 'gifts' && <GiftsTab />}
      {section.slug === 'redemptions' && <RedemptionsTab status={sp.status} />}
      {section.slug === 'offers' && <OffersTab />}
      {section.slug === 'app-content' && <AppContentTab section="content" />}
      {section.slug === 'notifications' && <NotificationsTab />}
      {section.slug === 'reports' && <ReportsTab report={sp.report} />}
      {section.slug === 'configuration' && <AppContentTab section="configuration" />}
    </>
  )
}
