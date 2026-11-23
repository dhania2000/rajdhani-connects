'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, ChevronDown, ChevronRight, Gift, LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, Users } from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { REWARD_SECTIONS, REWARDS_BASE, findRewardSection, rewardHref } from '@/lib/admin-nav'
import { cn } from '@/lib/utils'

const COLLAPSE_KEY = 'rts-admin-sidebar-collapsed'

const isUnder = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`)

function BrandMark() {
  return (
    <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] ring-1 ring-white/10" aria-hidden="true">
      <span className="size-4 rotate-45 rounded-[3px] border-[1.5px] border-gold" />
      <span className="absolute size-1.5 rotate-45 bg-gold" />
    </span>
  )
}

function NavItem({ href, label, icon: Icon, active, collapsed, onNavigate }: { href: string; label: string; icon: typeof Users; active: boolean; collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[13.5px] font-medium transition-colors',
        collapsed && 'justify-center px-0',
        active ? 'bg-navy-active text-white' : 'text-white/65 hover:bg-white/[0.05] hover:text-white',
      )}
    >
      {active ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold" aria-hidden="true" /> : null}
      <Icon className={cn('size-[18px] shrink-0', active ? 'text-white' : 'text-white/55 group-hover:text-white')} aria-hidden="true" />
      <span className={cn(collapsed && 'sr-only')}>{label}</span>
    </Link>
  )
}

function RewardsGroup({ collapsed, onExpandSidebar, onNavigate }: { collapsed?: boolean; onExpandSidebar?: () => void; onNavigate?: () => void }) {
  const pathname = usePathname()
  const inRewards = isUnder(pathname, REWARDS_BASE)
  const [open, setOpen] = useState(inRewards)

  useEffect(() => {
    if (inRewards) setOpen(true)
  }, [inRewards])

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (collapsed) {
            onExpandSidebar?.()
            setOpen(true)
          } else setOpen((v) => !v)
        }}
        aria-expanded={collapsed ? false : open}
        title={collapsed ? 'Rewards Engine' : undefined}
        aria-controls="rewards-engine-submenu"
        className={cn(
          'group relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13.5px] font-medium transition-colors',
          collapsed && 'justify-center px-0',
          inRewards ? 'bg-navy-active text-white' : 'text-white/65 hover:bg-white/[0.05] hover:text-white',
        )}
      >
        {inRewards ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-gold" aria-hidden="true" /> : null}
        <Gift className={cn('size-[18px] shrink-0', inRewards ? 'text-white' : 'text-white/55 group-hover:text-white')} aria-hidden="true" />
        <span className={cn('flex-1', collapsed && 'sr-only')}>Rewards Engine</span>
        {collapsed ? null : <ChevronDown className={cn('size-4 text-white/50 transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />}
      </button>

      <div className={cn('grid transition-[grid-template-rows] duration-200 ease-out', open && !collapsed ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <ul id="rewards-engine-submenu" className="relative mt-1 flex flex-col gap-0.5 pb-1 pl-[22px]">
            <span className="absolute inset-y-1 left-[21px] w-px bg-white/10" aria-hidden="true" />
            {REWARD_SECTIONS.map(({ slug, label, icon: Icon }) => {
              const href = rewardHref(slug)
              const active = isUnder(pathname, href)
              return (
                <li key={slug}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    tabIndex={open && !collapsed ? undefined : -1}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative ml-2 flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[12.5px] transition-colors',
                      active ? 'bg-white/[0.07] font-medium text-white' : 'text-white/55 hover:bg-white/[0.04] hover:text-white/90',
                    )}
                  >
                    {active ? <span className="absolute -left-[9px] top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-gold" aria-hidden="true" /> : null}
                    <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

function SidebarBody({ brand, collapsed, onExpand, onNavigate }: { brand: string; collapsed?: boolean; onExpand?: () => void; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <div className="flex h-full flex-col bg-navy text-white">
      <div className={cn('flex h-[74px] shrink-0 items-center gap-3 border-b border-white/[0.07] px-5', collapsed && 'justify-center px-0')}>
        <BrandMark />
        <div className={cn('min-w-0', collapsed && 'sr-only')}>
          <p className="truncate text-[13.5px] font-semibold leading-tight tracking-tight">{brand}</p>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">Admin Panel</p>
        </div>
      </div>

      <nav aria-label="Admin modules" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-5 [scrollbar-width:thin]">
        <p className={cn('px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/35', collapsed && 'sr-only')}>Main menu</p>
        <NavItem href="/admin/dashboard" label="Dashboard" icon={LayoutDashboard} active={isUnder(pathname, '/admin/dashboard')} collapsed={collapsed} onNavigate={onNavigate} />
        <RewardsGroup collapsed={collapsed} onExpandSidebar={onExpand} onNavigate={onNavigate} />
        <NavItem href="/admin/contractors" label="Contractor" icon={Users} active={isUnder(pathname, '/admin/contractors')} collapsed={collapsed} onNavigate={onNavigate} />
      </nav>

      <div className={cn('shrink-0 border-t border-white/[0.07] px-5 py-4', collapsed && 'hidden')}>
        <p className="text-[11px] text-white/40">Contractor Rewards Programme</p>
      </div>
    </div>
  )
}

function useBreadcrumbs() {
  const pathname = usePathname()
  if (isUnder(pathname, REWARDS_BASE)) {
    const slug = pathname.slice(REWARDS_BASE.length + 1).split('/')[0]
    const section = findRewardSection(slug) ?? REWARD_SECTIONS[0]
    return { crumbs: [{ label: 'Rewards Engine', href: rewardHref('overview') }], title: section.label }
  }
  if (isUnder(pathname, '/admin/contractors')) {
    const isProfile = pathname.split('/').length > 3
    return isProfile
      ? { crumbs: [{ label: 'Contractor', href: '/admin/contractors' }], title: 'Contractor Profile' }
      : { crumbs: [], title: 'Contractor' }
  }
  return { crumbs: [], title: 'Dashboard' }
}

export function AdminShell({
  brand,
  adminName,
  adminRole,
  alertCount = 0,
  logoutAction,
  children,
}: {
  brand: string
  adminName: string
  adminRole: string
  alertCount?: number
  logoutAction: () => Promise<void>
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1')
  }, [])

  const updateCollapsed = (value: boolean) => {
    setCollapsed(value)
    window.localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0')
  }
  const { crumbs, title } = useBreadcrumbs()
  const initials = adminName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const isSuper = adminRole === 'super_admin'
  const roleLabel = adminRole.replace(/_/g, ' ')

  return (
    <div className="flex min-h-dvh bg-app-bg">
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 overflow-hidden transition-[width] duration-200 ease-out lg:block',
          collapsed ? 'w-[76px]' : 'w-[260px]',
        )}
      >
        <SidebarBody brand={brand} collapsed={collapsed} onExpand={() => updateCollapsed(false)} />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] max-w-[85vw] border-0 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody brand={brand} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[74px] items-center gap-3 border-b border-border bg-white/90 px-3 backdrop-blur-md sm:px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-app-bg lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => updateCollapsed(!collapsed)}
            className="hidden size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-app-bg hover:text-ink lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={collapsed}
          >
            {collapsed ? <PanelLeftOpen className="size-[18px]" aria-hidden="true" /> : <PanelLeftClose className="size-[18px]" aria-hidden="true" />}
          </button>
          <span className="hidden h-7 w-px bg-border lg:block" aria-hidden="true" />

          <div className="min-w-0 flex-1">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-1.5 text-xs text-ink-muted">
                <li>
                  <Link href="/admin/dashboard" className="hover:text-ink">
                    Admin
                  </Link>
                </li>
                {crumbs.map((c) => (
                  <li key={c.href} className="flex items-center gap-1.5">
                    <ChevronRight className="size-3 opacity-60" aria-hidden="true" />
                    <Link href={c.href} className="hover:text-ink">
                      {c.label}
                    </Link>
                  </li>
                ))}
                <li className="flex min-w-0 items-center gap-1.5" aria-current="page">
                  <ChevronRight className="size-3 opacity-60" aria-hidden="true" />
                  <span className="truncate text-ink">{title}</span>
                </li>
              </ol>
            </nav>
            <p className="mt-0.5 truncate text-[15px] font-semibold tracking-tight text-ink">{title}</p>
          </div>

          <form action="/admin/contractors" role="search" className="relative hidden md:block">
            <label htmlFor="admin-search" className="sr-only">
              Search contractors
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <input
              id="admin-search"
              name="q"
              placeholder="Search contractors"
              className="h-9 w-56 rounded-lg border border-border bg-app-bg pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-brand focus:bg-white xl:w-64"
            />
          </form>

          <Link
            href="/admin/contractors"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-app-bg hover:text-ink md:hidden"
            aria-label="Search contractors"
          >
            <Search className="size-[18px]" aria-hidden="true" />
          </Link>

          <Link
            href={rewardHref('activities', { status: 'submitted' })}
            className="relative flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-app-bg hover:text-ink"
            aria-label={alertCount > 0 ? `${alertCount} items awaiting review` : 'No items awaiting review'}
          >
            <Bell className="size-[18px]" aria-hidden="true" />
            {alertCount > 0 ? <span className="absolute right-2 top-2 size-2 rounded-full bg-danger ring-2 ring-white" aria-hidden="true" /> : null}
          </Link>

          <span className="hidden h-7 w-px bg-border sm:block" aria-hidden="true" />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex shrink-0 items-center gap-2.5 rounded-lg py-1 pl-1 pr-1.5 outline-none transition-colors hover:bg-app-bg focus-visible:ring-2 focus-visible:ring-brand/40 sm:pr-2">
              <span className="relative flex size-9 items-center justify-center rounded-full bg-navy text-[13px] font-semibold text-white ring-2 ring-gold/70 ring-offset-2 ring-offset-white" aria-hidden="true">
                {initials}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[13px] font-semibold leading-tight text-ink">{adminName}</span>
                <span className={cn('mt-0.5 inline-flex rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider', isSuper ? 'bg-gold/15 text-gold-strong' : 'bg-app-bg text-ink-muted')}>
                  {roleLabel}
                </span>
              </span>
              <ChevronDown className="hidden size-4 text-ink-muted sm:block" aria-hidden="true" />
              <span className="sr-only">Open profile menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
                  <span className="text-sm font-semibold text-ink">{adminName}</span>
                  <span className="text-xs capitalize text-ink-muted">{roleLabel}</span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/admin/dashboard" />}>
                <LayoutDashboard className="size-4" aria-hidden="true" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href={rewardHref('configuration')} />}>
                <Gift className="size-4" aria-hidden="true" />
                Rewards configuration
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={logoutAction}>
                <DropdownMenuItem render={<button type="submit" className="w-full" />} variant="destructive">
                  <LogOut className="size-4" aria-hidden="true" />
                  Log out
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-1 flex-col gap-6 p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
      <Toaster position="top-right" theme="light" richColors closeButton />
    </div>
  )
}
