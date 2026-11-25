'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Gift, House, Images, ShoppingCart, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/contractor', label: 'Home', icon: House, match: (p: string) => !/^\/contractor\/(sales|rewards|gallery|profile)/.test(p) },
  { href: '/contractor/sales', label: 'Sales', icon: ShoppingCart, match: (p: string) => p.startsWith('/contractor/sales') },
  { href: '/contractor/rewards', label: 'Rewards', icon: Gift, match: (p: string) => p.startsWith('/contractor/rewards') },
  { href: '/contractor/gallery', label: 'Gallery', icon: Images, match: (p: string) => p.startsWith('/contractor/gallery') },
  { href: '/contractor/profile', label: 'Profile', icon: User, match: (p: string) => p.startsWith('/contractor/profile') },
]

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[420px] border-t border-border bg-white pb-safe"
    >
      <ul className="grid h-16 grid-cols-5">
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                  active ? 'text-brand' : 'text-[#7a8199] hover:text-ink',
                )}
              >
                <Icon
                  className="size-[22px]"
                  strokeWidth={2}
                  fill={active ? 'currentColor' : 'none'}
                  fillOpacity={active ? 0.9 : 0}
                />
                <span className={cn(active && 'font-semibold')}>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
