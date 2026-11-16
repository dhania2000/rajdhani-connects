import { cn } from '@/lib/utils'

const styles: Record<string, string> = {
  approved: 'bg-success/10 text-[#047857]',
  credited: 'bg-success/10 text-[#047857]',
  delivered: 'bg-success/10 text-[#047857]',
  active: 'bg-success/10 text-[#047857]',
  pending: 'bg-warn/15 text-[#92400e]',
  requested: 'bg-warn/15 text-[#92400e]',
  expiring: 'bg-warn/15 text-[#92400e]',
  rejected: 'bg-danger/10 text-[#b42318]',
  redeemed: 'bg-lavender text-brand',
  upcoming: 'bg-info/10 text-info',
}

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize',
        styles[status] ?? 'bg-muted text-ink-muted',
        className,
      )}
    >
      {status}
    </span>
  )
}
