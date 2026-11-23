'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { BRAND_NAME } from '@/lib/mock-data'
import { useContractor } from '@/components/contractor/contractor-store'
import { BrandLogo } from './brand-logo'

export function AppHeader() {
  const { unreadCount } = useContractor()

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-b from-navy to-navy-2 pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <BrandLogo className="size-8 shrink-0" />
          <h1 className="truncate text-[17px] font-semibold tracking-tight text-white">{BRAND_NAME}</h1>
        </div>
        <Link
          href="/contractor/notifications"
          className="relative -mr-1.5 flex size-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Bell className="size-[22px]" strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2.5 size-2 rounded-full bg-warn ring-2 ring-navy" aria-hidden="true" />
          )}
        </Link>
      </div>
    </header>
  )
}
