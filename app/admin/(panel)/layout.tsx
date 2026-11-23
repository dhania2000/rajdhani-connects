import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { requireAdmin } from '@/lib/server/auth'
import { getAdminAlertCount } from '@/lib/server/admin-rewards'
import { AdminShell } from '@/components/admin/shell/admin-shell'
import { adminLogoutAction } from '../actions'

export const metadata: Metadata = {
  title: 'Admin – Rajdhani Tiles & Sanitary',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin()
  const alertCount = await getAdminAlertCount().catch(() => 0)
  return (
    <AdminShell brand="Rajdhani Tiles & Sanitary" adminName={admin.name} adminRole={admin.role} alertCount={alertCount} logoutAction={adminLogoutAction}>
      {children}
    </AdminShell>
  )
}
