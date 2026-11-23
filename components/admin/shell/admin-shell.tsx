'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Gift, LayoutDashboard, LogOut, Menu, Users } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/contractors', label: 'Contractor Management', icon: Users },
  { href: '/admin/rewards-engine', label: 'Rewards Engine', icon: Gift },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Admin modules" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/8 hover:text-white',
            )}
          >
            <Icon className="size-4.5 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarBody({ brand, onNavigate }: { brand: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-8 bg-navy p-4 text-white">
      <div className="px-2 pt-2">
        <p className="text-sm font-semibold leading-tight">{brand}</p>
        <p className="mt-0.5 text-xs text-white/60">Admin Panel</p>
      </div>
      <NavLinks onNavigate={onNavigate} />
    </div>
  )
}

export function AdminShell({
  brand,
  adminName,
  adminRole,
  logoutAction,
  children,
}: {
  brand: string
  adminName: string
  adminRole: string
  logoutAction: () => Promise<void>
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const initials = adminName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex min-h-dvh bg-app-bg">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 lg:block">
        <SidebarBody brand={brand} />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 border-0 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody brand={brand} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex size-9 items-center justify-center rounded-lg text-ink hover:bg-app-bg lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-ink">{adminName}</p>
              <p className="text-xs capitalize text-ink-muted">{adminRole.replace('_', ' ')}</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white" aria-hidden="true">
              {initials}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-ink-muted hover:bg-app-bg hover:text-ink"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
