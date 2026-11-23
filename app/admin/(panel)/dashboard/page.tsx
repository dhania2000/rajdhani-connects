import Link from 'next/link'
import { ClipboardCheck, Coins, Gift, UserCheck, UserPlus, Users } from 'lucide-react'
import { getDashboardMetrics } from '@/lib/server/admin-rewards'
import { DataTable, EmptyState, fmtCurrency, fmtDate, fmtNumber, PageHeader, Panel, StatCard, Td } from '@/components/admin/ui'

export default async function AdminDashboardPage() {
  const { counts, monthly, top, recent } = await getDashboardMetrics()
  const maxBar = Math.max(1, ...monthly.flatMap((m) => [Number(m.issued), Number(m.redeemed)]))

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of contractors, sales activity, and reward liability." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total contractors" value={fmtNumber(counts.contractors_total)} icon={Users} hint={`${fmtNumber(counts.contractors_active)} active`} />
        <StatCard label="Pending approval" value={fmtNumber(counts.contractors_pending)} icon={UserPlus} tone="amber" />
        <StatCard label="Sales awaiting review" value={fmtNumber(counts.activities_pending)} icon={ClipboardCheck} tone="amber" />
        <StatCard label="Open gift claims" value={fmtNumber(counts.redemptions_open)} icon={Gift} tone="red" />
        <StatCard label="Points outstanding" value={fmtNumber(counts.points_available)} icon={Coins} tone="green" hint={`${fmtNumber(counts.points_reserved)} reserved for claims`} />
        <StatCard label="Tokens outstanding" value={fmtNumber(counts.tokens_available)} icon={UserCheck} tone="green" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Panel title="Points issued vs redeemed" description="Last 6 months" className="xl:col-span-3">
          {monthly.length === 0 ? (
            <EmptyState title="No reward transactions yet" description="Points appear here once sales are approved." />
          ) : (
            <ul className="flex flex-col gap-4">
              {monthly.map((m) => (
                <li key={m.month} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs text-ink-muted">
                    <span className="font-medium text-ink">{m.month}</span>
                    <span>
                      {fmtNumber(m.issued)} issued / {fmtNumber(m.redeemed)} redeemed
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-app-bg">
                    <div className="h-2 rounded-full bg-brand" style={{ width: `${(Number(m.issued) / maxBar) * 100}%` }} />
                  </div>
                  <div className="h-2 rounded-full bg-app-bg">
                    <div className="h-2 rounded-full bg-amber-500" style={{ width: `${(Number(m.redeemed) / maxBar) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent activity" className="xl:col-span-2">
          {recent.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {recent.map((r) => (
                <li key={r.id} className="py-2.5 text-sm">
                  <p className="text-ink">{r.summary ?? r.action}</p>
                  <p className="text-xs text-ink-muted">
                    {r.action} &middot; {fmtDate(r.created_at)}
                  </p>
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
