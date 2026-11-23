import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { OffersView } from '@/components/contractor/offers/offers-view'

export const metadata: Metadata = { title: 'Offers & Schemes – Rajdhani Connects' }

export default function OffersPage() {
  return (
    <>
      <PageHeader title="Offers & Schemes" subtitle="Earn more with active schemes" />
      <OffersView />
    </>
  )
}
