import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { NotificationsView } from '@/components/contractor/shared/notifications-view'

export const metadata: Metadata = { title: 'Notifications – Rajdhani Connects' }

export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="Notifications" />
      <NotificationsView />
    </>
  )
}
