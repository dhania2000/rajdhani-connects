import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { SalesView } from '@/components/contractor/sales/sales-view'

export const metadata: Metadata = { title: 'My Sales – Rajdhani Connects' }

export default function SalesPage() {
  return (
    <>
      <PageHeader title="My Sales" subtitle="Referrals you brought" />
      <SalesView />
    </>
  )
}
