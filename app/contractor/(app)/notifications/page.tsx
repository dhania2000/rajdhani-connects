import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { NotificationsView } from '@/components/contractor/shared/notifications-view'
import { requireContractor } from '@/lib/server/auth'
import { getNotifications } from '@/lib/server/contractor-app'

export const metadata: Metadata = { title: 'Notifications – Rajdhani Connects' }

export default async function NotificationsPage() {
  const session = await requireContractor()
  const { items, readIds } = await getNotifications(session.contractorId)
  return (
    <>
      <PageHeader title="Notifications" />
      <NotificationsView notifications={items} readIds={readIds} />
    </>
  )
}
