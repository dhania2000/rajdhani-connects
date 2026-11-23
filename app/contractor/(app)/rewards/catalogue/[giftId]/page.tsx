import { notFound } from 'next/navigation'
import { getGift } from '@/lib/server/contractor-app'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { ClaimRewardView } from '@/components/contractor/rewards/claim-reward-view'

export default async function ClaimRewardPage({ params }: { params: Promise<{ giftId: string }> }) {
  const { giftId } = await params
  const gift = await getGift(decodeURIComponent(giftId))
  if (!gift) notFound()

  return (
    <>
      <PageHeader title="Claim Reward" subtitle={gift.name} backHref="/contractor/rewards/catalogue" />
      <ClaimRewardView gift={gift} />
    </>
  )
}
