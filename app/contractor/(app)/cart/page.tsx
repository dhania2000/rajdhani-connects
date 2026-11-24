import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { CartView } from '@/components/contractor/cart/cart-view'
import { requireContractor } from '@/lib/server/auth'
import { listContractorCartRequests } from '@/lib/server/enquiries'

export const metadata: Metadata = { title: 'My Cart – Rajdhani Connects' }

export default async function CartPage() {
  const session = await requireContractor()
  const requests = await listContractorCartRequests(session.contractorId)
  return (
    <>
      <PageHeader title="My Cart" subtitle="Products to send to the store" backHref="/contractor/catalogue" />
      <CartView requests={requests} />
    </>
  )
}
