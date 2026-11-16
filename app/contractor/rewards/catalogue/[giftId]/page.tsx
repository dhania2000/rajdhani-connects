import { notFound } from 'next/navigation'
import { gifts } from '@/lib/mock-data'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { ClaimRewardView } from '@/components/contractor/rewards/claim-reward-view'

export function generateStaticParams() {
  return gifts.map((g) => ({ giftId: g.id }))
}

export default async function ClaimRewardPage({ params }: { params: Promise<{ giftId: string }> }) {
  const { giftId } = await params
  const gift = gifts.find((g) => g.id === giftId)
  if (!gift) notFound()

  return (
    <>
      <PageHeader title="Claim Reward" subtitle={gift.name} backHref="/contractor/rewards/catalogue" />
      <ClaimRewardView gift={gift} />
    </>
  )
}
