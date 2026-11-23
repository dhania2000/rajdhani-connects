import Link from 'next/link'
import { CalendarClock, ClipboardCheck, Coins, Gift, Megaphone, PackageCheck, Scale, Sparkles, Ticket, Wallet } from 'lucide-react'
import { getDashboardMetrics, getRewardsOverview, listRecentTransactions, listRedemptions } from '@/lib/server/admin-rewards'
import { DataTable, EmptyState, fmtDate, fmtNumber, Panel, StatCard, StatusBadge, Td } from '@/components/admin/ui'

const QUICK = [
  { href: '/admin/rewards-engine/rules', label: 'Create reward rule' },
  { href: '/admin/rewards-engine/activities', label: 'Record activity' },
  { href: '/admin/rewards-engine/points-tokens', label: 'Assign points / tokens' },
  { href: '/admin/rewards-engine/gifts', label: 'Add gift' },
  { href: '/admin/rewards-engine/redemptions?status=requested', label: 'Review claims' },
]

export async function OverviewTab() {
  const [o, { top }, txns, claims] = await Promise.all([
    getRewardsOverview(),
    getDashboardMetrics(),
    listRecentTransactions(10),
    listRedemptions('requested'),
  ])

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Active reward rules" value={fmtNumber(o.active_rules)} icon={Scale} />
        <StatCard label="Total points issued" value={fmtNumber(o.points_issued)} icon={Coins} tone="green" />
        <StatCard label="Total tokens issued" value={fmtNumber(o.tokens_issued)} icon={Ticket} tone="green" />
        <StatCard label="Available balances" value={fmtNumber(o.points_available)} icon={Wallet} hint={`${fmtNumber(o.tokens_available)} tokens`} />
        <StatCard label="Pending reward entries" value={fmtNumber(o.pending_entries)} icon={ClipboardCheck} tone="amber" />
        <StatCard label="Points redeemed" value={fmtNumber(o.points_redeemed)} icon={PackageCheck} />
        <StatCard label="Pending claims" value={fmtNumber(o.pending_claims)} icon={Gift} tone="red" />
        <StatCard label="Active gifts" value={fmtNumber(o.active_gifts)} icon={Sparkles} />
        <StatCard label="Active offers" value={fmtNumber(o.active_offers)} icon={Megaphone} />
        <StatCard label="Expiring in 14 days" value={fmtNumber(o.expiring_offers)} icon={CalendarClock} tone="amber" />
      </div>

      <Panel title="Quick actions">
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <Link key={q.href} href={q.href} className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-ink hover:border-brand hover:text-brand">
              {q.label}
            </Link>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Recent transactions">
          {txns.length === 0 ? (
            <EmptyState title="No transactions yet" />
          ) : (
            <DataTable head={['Date', 'Contractor', 'Type', 'Amount']}>
              {txns.map((t) => (
                <tr key={t.id}>
                  <Td>{fmtDate(t.created_at)}</Td>
                  <Td>{t.contractor_name}</Td>
                  <Td className="capitalize">{t.entry_type.replace(/_/g, ' ')}</Td>
                  <Td className="tabular-nums">
                    {fmtNumber(t.amount)} {t.currency}
                  </Td>
                </tr>
              ))}
            </DataTable>
          )}
        </Panel>
        <Panel title="Pending claims">
          {claims.length === 0 ? (
            <EmptyState title="No pending claims" />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {claims.slice(0, 8).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-ink">{c.gift_name}</p>
                    <p className="text-xs text-ink-muted">
                      {c.claim_code} &middot; {c.contractor_name} &middot; {fmtDate(c.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Top earning contractors">
        {top.length === 0 ? (
          <EmptyState title="No contractors yet" />
        ) : (
          <DataTable head={['Contractor', 'Code', 'Points earned']}>
            {top.map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link href={`/admin/contractors/${c.id}`} className="font-medium hover:text-brand">
                    {c.name}
                  </Link>
                </Td>
                <Td className="font-mono text-xs">{c.contractor_code}</Td>
                <Td className="tabular-nums">{fmtNumber(c.earned)}</Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
    </>
  )
}
