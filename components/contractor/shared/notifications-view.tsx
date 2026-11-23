'use client'

import { Bell, Gift, ShoppingCart, Tag } from 'lucide-react'
import { notifications } from '@/lib/mock-data'
import type { AppNotification } from '@/lib/types'
import { useContractor } from '@/components/contractor/contractor-store'
import { cn } from '@/lib/utils'

const icons: Record<AppNotification['kind'], { icon: typeof Bell; className: string }> = {
  reward: { icon: Gift, className: 'bg-lavender text-brand' },
  sale: { icon: ShoppingCart, className: 'bg-success/10 text-success' },
  offer: { icon: Tag, className: 'bg-warn/15 text-[#b45309]' },
  system: { icon: Bell, className: 'bg-info/10 text-info' },
}

export function NotificationsView() {
  const { unreadCount, markAllNotificationsRead } = useContractor()

  return (
    <main className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
        <button
          type="button"
          onClick={markAllNotificationsRead}
          disabled={unreadCount === 0}
          className="text-[13px] font-semibold text-brand disabled:text-ink-muted"
        >
          Mark all as read
        </button>
      </div>
      <ul className="flex flex-col gap-2.5">
        {notifications.map((n, index) => {
          const { icon: Icon, className } = icons[n.kind]
          const unread = index < unreadCount
          return (
            <li key={n.id} className={cn('flex gap-3 rounded-xl bg-white p-3.5 shadow-[0_1px_3px_rgba(28,35,64,0.08)]', unread && 'ring-1 ring-brand/25')}>
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', className)} aria-hidden="true">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink">
                    {n.title}
                    {unread && <span className="sr-only"> (unread)</span>}
                  </p>
                  {unread && <span className="size-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />}
                </div>
                <p className="text-[13px] text-ink-muted">{n.body}</p>
                <p className="mt-1 text-[11px] text-ink-muted">{n.time}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
