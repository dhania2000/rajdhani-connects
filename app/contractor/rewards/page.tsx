import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { EarnedRewardsView } from '@/components/contractor/rewards/earned-rewards-view'

export const metadata: Metadata = { title: 'Earned Rewards – Rajdhani Tiles & Sanitary' }

export default function RewardsPage() {
  return (
    <>
      <PageHeader title="Earned Rewards" subtitle="1 point = ₹1 reward value" />
      <EarnedRewardsView />
    </>
  )
}
