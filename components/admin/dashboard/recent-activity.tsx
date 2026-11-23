import { fmtDate, StatusBadge } from '@/components/admin/ui'

export type RecentActivityItem = {
  id: number
  action: string
  summary: string | null
  created_at: string
  actor_type: 'admin' | 'contractor' | 'system'
  entity_type: string
  actor_name: string | null
}

const STATUS_BY_VERB: Record<string, string> = {
  approved: 'approved',
  approve: 'approved',
  rejected: 'rejected',
  reject: 'rejected',
  reversed: 'reversed',
  suspend: 'suspended',
  deactivate: 'inactive',
  reactivate: 'active',
  requested: 'requested',
  archived: 'archived',
  created: 'completed',
  updated: 'completed',
  sent: 'completed',
}

const humanize = (s: string) => s.replace(/[_.]/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

function describe(item: RecentActivityItem) {
  const verb = item.action.split('.').pop() ?? item.action
  return {
    type: humanize(item.entity_type || item.action.split('.')[0]),
    status: STATUS_BY_VERB[verb] ?? 'completed',
    user: item.actor_name ?? (item.actor_type === 'system' ? 'System' : humanize(item.actor_type)),
    description: item.summary ?? humanize(item.action),
  }
}

export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <ul className="-my-1 flex flex-col divide-y divide-border">
      {items.map((item) => {
        const { type, status, user, description } = describe(item)
        return (
          <li key={item.id} className="flex items-start gap-3 py-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-app-bg text-[11px] font-semibold text-ink-muted" aria-hidden="true">
              {user.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-pretty text-[13px] leading-snug text-ink">{description}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-ink-muted">
                <span className="font-medium text-ink/80">{user}</span>
                <span aria-hidden="true">&middot;</span>
                <span>{type}</span>
                <span aria-hidden="true">&middot;</span>
                <time dateTime={item.created_at}>{fmtDate(item.created_at)}</time>
              </p>
            </div>
            <StatusBadge status={status} />
          </li>
        )
      })}
    </ul>
  )
}
