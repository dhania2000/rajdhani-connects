import Link from 'next/link'
import { ClipboardCheck, Coins, Gift, UserCheck, UserPlus, Users } from 'lucide-react'
import { getDashboardMetrics } from '@/lib/server/admin-rewards'
import { PointsChart } from '@/components/admin/dashboard/points-chart'
import { DataTable, EmptyState, fmtCurrency, fmtDate, fmtNumber, PageHeader, Panel, StatCard, Td } from '@/components/admin/ui'

export default async function AdminDashboardPage() {
  const { counts, monthly, top, recent } = await getDashboardMetrics()
  return (
    <>
      <PageHeader title="Dashboard" description="Overview of contractors, reward activities, and reward liability." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Total contractors" value={fmtNumber(counts.contractors_total)} icon={Users} hint={`${fmtNumber(counts.contractors_active)} active`} />
        <StatCard label="Pending approval" value={fmtNumber(counts.contractors_pending)} icon={UserPlus} tone="amber" hint="Awaiting account review" />
        <StatCard label="Activities awaiting review" value={fmtNumber(counts.activities_pending)} icon={ClipboardCheck} tone="amber" hint="Submitted reward activities" />
        <StatCard label="Open gift claims" value={fmtNumber(counts.redemptions_open)} icon={Gift} tone="red" hint="Requested to handover" />
        <StatCard label="Points outstanding" value={fmtNumber(counts.points_available)} icon={Coins} tone="gold" hint={`${fmtNumber(counts.points_reserved)} reserved for claims`} />
        <StatCard label="Tokens outstanding" value={fmtNumber(counts.tokens_available)} icon={UserCheck} tone="green" hint="Available contractor tokens" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Panel title="Points issued vs redeemed" description="Last 6 months" className="xl:col-span-3">
          {monthly.length === 0 ? (
            <EmptyState title="No reward transactions yet" description="Points appear here once sales are approved." />
          ) : (
            <PointsChart data={monthly} />
          )}
        </Panel>

        <Panel title="Recent activity" className="xl:col-span-2">
          {recent.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <ul className="-my-1 flex flex-col divide-y divide-border">
              {recent.map((r) => (
                <li key={r.id} className="flex gap-3 py-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand/60" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-pretty text-[13px] leading-snug text-ink">{r.summary ?? r.action}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-muted">
                      <span className="rounded bg-app-bg px-1.5 py-px font-mono text-[10.5px]">{r.action}</span>
                      <span>{fmtDate(r.created_at)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Top contractors"
        actions={
          <Link href="/admin/contractors" className="text-sm font-medium text-brand hover:underline">
            View all
          </Link>
        }
      >
        {top.length === 0 ? (
          <EmptyState title="No contractors yet" description="Add your first contractor from Contractor Management." />
        ) : (
          <DataTable head={['Contractor', 'Code', 'Points earned', 'Approved sales']}>
            {top.map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link href={`/admin/contractors/${c.id}`} className="font-medium hover:text-brand">
                    {c.name}
                  </Link>
                </Td>
                <Td className="font-mono text-xs">{c.contractor_code}</Td>
                <Td className="tabular-nums">{fmtNumber(c.earned)}</Td>
                <Td className="tabular-nums">{fmtCurrency(c.sales)}</Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
    </>
  )
}
