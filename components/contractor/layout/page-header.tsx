'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { MobileStatusBar } from './mobile-status-bar'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, backHref = '/contractor', action }: PageHeaderProps) {
  const router = useRouter()

  const goBack = () => {
    if (window.history.length > 1) router.back()
    else router.push(backHref)
  }

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-b from-navy to-navy-2">
      <MobileStatusBar />
      <div className="flex h-14 items-center gap-1 px-2">
        <button
          type="button"
          onClick={goBack}
          className="flex size-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
          aria-label="Go back"
        >
          <ChevronLeft className="size-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-semibold text-white">{title}</h1>
          {subtitle && <p className="truncate text-xs text-white/70">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  )
}
