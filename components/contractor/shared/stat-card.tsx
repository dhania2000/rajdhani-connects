import { cn } from '@/lib/utils'

const tones = {
  brand: 'bg-lavender text-brand',
  success: 'bg-success/10 text-success',
  warn: 'bg-warn/10 text-[#b45309]',
  info: 'bg-info/10 text-info',
  danger: 'bg-danger/10 text-danger',
} as const

export type StatTone = keyof typeof tones

interface StatCardProps {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  tone?: StatTone
}

export function StatCard({ label, value, icon: Icon, tone = 'brand' }: StatCardProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white p-3 shadow-[0_1px_3px_rgba(28,35,64,0.08)]">
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-bold text-ink">{value}</p>
        <p className="truncate text-[11px] text-ink-muted">{label}</p>
      </div>
    </div>
  )
}
