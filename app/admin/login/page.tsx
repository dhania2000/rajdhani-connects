import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/server/auth'
import { AuthShell } from '@/components/contractor/auth/auth-shell'
import { AdminLoginForm } from '@/components/admin/admin-login-form'

export const metadata: Metadata = {
  title: 'Admin Login – Rajdhani Connects',
  robots: { index: false, follow: false },
  manifest: '/admin-manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Rajdhani Admin', statusBarStyle: 'black-translucent' },
}
export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
  const session = await getAdminSession()
  if (session) redirect('/admin')

  return (
    <AuthShell title="Admin Login" description="Sign in to manage contractors, sales, and rewards." subtitle="Admin Panel">
      <AdminLoginForm />
    </AuthShell>
  )
}
