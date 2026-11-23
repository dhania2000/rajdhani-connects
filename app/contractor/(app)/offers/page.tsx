import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { OffersView } from '@/components/contractor/offers/offers-view'
import { requireContractor } from '@/lib/server/auth'
import { getOffersAndTargets } from '@/lib/server/contractor-app'

export const metadata: Metadata = { title: 'Offers & Schemes – Rajdhani Connects' }

export default async function OffersPage() {
  const session = await requireContractor()
  const { offers, targets } = await getOffersAndTargets(session.contractorId)
  return (
    <>
      <PageHeader title="Offers & Schemes" subtitle="Earn more with active schemes" />
      <OffersView offers={offers} targets={targets} />
    </>
  )
}
