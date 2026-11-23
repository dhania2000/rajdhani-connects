import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { EarnedRewardsView } from '@/components/contractor/rewards/earned-rewards-view'
import { requireContractor } from '@/lib/server/auth'
import { getRewardSummary, getRewardTransactions } from '@/lib/server/contractor-app'

export const metadata: Metadata = { title: 'Earned Rewards – Rajdhani Connects' }

export default async function RewardsPage() {
  const session = await requireContractor()
  const [summary, transactions] = await Promise.all([
    getRewardSummary(session.contractorId),
    getRewardTransactions(session.contractorId),
  ])
  return (
    <>
      <PageHeader title="Earned Rewards" subtitle="1 point = ₹1 reward value" />
      <EarnedRewardsView summary={summary} transactions={transactions} />
    </>
  )
}
