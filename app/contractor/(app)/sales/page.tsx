import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { SalesView } from '@/components/contractor/sales/sales-view'
import { requireContractor } from '@/lib/server/auth'
import { getSales } from '@/lib/server/contractor-app'

export const metadata: Metadata = { title: 'My Sales – Rajdhani Connects' }

export default async function SalesPage() {
  const session = await requireContractor()
  const records = await getSales(session.contractorId)
  return (
    <>
      <PageHeader title="My Sales" subtitle="Referrals you brought" />
      <SalesView records={records} />
    </>
  )
}
