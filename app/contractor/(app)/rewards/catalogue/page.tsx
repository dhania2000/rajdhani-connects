import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { GiftCatalogueView } from '@/components/contractor/rewards/gift-catalogue-view'

export const metadata: Metadata = { title: 'Reward Catalogue – Rajdhani Tiles & Sanitary' }

export default async function RewardCataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  return (
    <>
      <PageHeader title="Reward Catalogue" subtitle="Redeem your points for gifts" backHref="/contractor/rewards" />
      <GiftCatalogueView initialFilter={filter === 'redeemable' ? 'redeemable' : 'all'} />
    </>
  )
}
