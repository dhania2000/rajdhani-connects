import type { Metadata } from 'next'
import { LogOut } from 'lucide-react'
import { requireAdmin } from '@/lib/server/auth'
import { adminLogoutAction } from './actions'
import { BrandLogo } from '@/components/contractor/layout/brand-logo'
import { BRAND_NAME } from '@/lib/mock-data'

export const metadata: Metadata = {
  title: 'Admin – Rajdhani Tiles & Sanitary',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function AdminHomePage() {
  const session = await requireAdmin()

  return (
    <div className="min-h-dvh bg-app-bg">
      <header className="flex items-center justify-between gap-4 bg-navy px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <BrandLogo className="size-9" />
          <span className="font-semibold">{BRAND_NAME} · Admin</span>
        </div>
        <form action={adminLogoutAction}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Logout
          </button>
        </form>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-2 p-6">
        <h1 className="text-2xl font-bold text-ink">Welcome, {session.name}</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as {session.email} ({session.role === 'super_admin' ? 'Super Admin' : 'Admin'}).
        </p>
      </main>
    </div>
  )
}
