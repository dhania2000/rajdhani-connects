import Link from 'next/link'
import { getReport } from '@/lib/server/admin-rewards'
import { DataTable, EmptyState, fmtDate, Panel, Td } from '@/components/admin/ui'
import { cn } from '@/lib/utils'

const REPORTS = [
  { value: 'liability', label: 'Balance liability' },
  { value: 'redemptions', label: 'Redemptions by gift' },
  { value: 'leaderboard', label: 'Contractor leaderboard' },
  { value: 'ledger', label: 'Full ledger' },
] as const

type Report = (typeof REPORTS)[number]['value']

function cell(key: string, v: unknown) {
  if (v == null) return '\u2014'
  if (key.endsWith('_at') || v instanceof Date) return fmtDate(v as string)
  if (typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) && !key.includes('code') && key !== 'mobile')) {
    return Number(v).toLocaleString('en-IN')
  }
  return String(v)
}

export async function ReportsTab({ report }: { report?: string }) {
  const type: Report = REPORTS.some((r) => r.value === report) ? (report as Report) : 'liability'
  const rows = (await getReport(type)) as Record<string, unknown>[]
  const cols = rows[0] ? Object.keys(rows[0]) : []
  const shown = rows.slice(0, 500)

  return (
    <Panel title="Reports & history" description={rows.length > shown.length ? `Showing first ${shown.length} of ${rows.length} rows.` : `${rows.length} rows`}>
      <nav aria-label="Report type" className="mb-4 flex flex-wrap gap-1">
        {REPORTS.map((r) => (
          <Link
            key={r.value}
            href={`/admin/rewards-engine/reports?report=${r.value}`}
            aria-current={type === r.value ? 'page' : undefined}
            className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', type === r.value ? 'bg-brand text-white' : 'text-ink-muted hover:bg-app-bg hover:text-ink')}
          >
            {r.label}
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <EmptyState title="No data yet" />
      ) : (
        <DataTable head={cols.map((c) => c.replace(/_/g, ' '))}>
          {shown.map((row, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <Td key={c} className="text-xs tabular-nums">
                  {cell(c, row[c])}
                </Td>
              ))}
            </tr>
          ))}
        </DataTable>
      )}
    </Panel>
  )
}
