import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { ClaimHistoryView } from '@/components/contractor/rewards/claim-history-view'

export const metadata: Metadata = { title: 'Claim History – Rajdhani Connects' }

export default function ClaimsPage() {
  return (
    <>
      <PageHeader title="Claim History" subtitle="Track your gift requests" backHref="/contractor/rewards" />
      <ClaimHistoryView />
    </>
  )
}
