import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { GiftCatalogueView } from '@/components/contractor/rewards/gift-catalogue-view'
import { getGifts } from '@/lib/server/contractor-app'

export const metadata: Metadata = { title: 'Reward Catalogue – Rajdhani Connects' }

export default async function RewardCataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const [{ filter }, gifts] = await Promise.all([searchParams, getGifts()])
  return (
    <>
      <PageHeader title="Reward Catalogue" subtitle="Redeem your points for gifts" backHref="/contractor/rewards" />
      <GiftCatalogueView gifts={gifts} initialFilter={filter === 'redeemable' ? 'redeemable' : 'all'} />
    </>
  )
}
