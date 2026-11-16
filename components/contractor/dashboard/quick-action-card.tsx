import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

export interface QuickAction {
  href: string
  title: string
  subtitle?: string
  icon: LucideIcon
  color: string
}

export function QuickActionCard({ href, title, subtitle, icon: Icon, color }: QuickAction) {
  return (
    <Link
      href={href}
      className="flex min-h-[96px] flex-col items-center justify-center rounded-xl bg-white px-1.5 py-3 text-center shadow-[0_1px_4px_rgba(28,35,64,0.08)] transition-transform active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <Icon className="mb-1.5 size-7" style={{ color }} fill={color} fillOpacity={0.22} strokeWidth={2} aria-hidden="true" />
      <span className="text-[13px] leading-tight font-semibold whitespace-pre-line text-ink max-[340px]:text-[12px]">
        {title}
      </span>
      {subtitle && <span className="mt-0.5 text-[11px] leading-tight text-ink-muted max-[340px]:text-[10px]">{subtitle}</span>}
    </Link>
  )
}
