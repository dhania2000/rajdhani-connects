import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Coins, Gift, ShoppingBag, Clock } from 'lucide-react'
import { getContractorDetail, type AccountStatus, type StatusAction } from '@/lib/server/contractors'
import { getContractorPerformance, listGifts } from '@/lib/server/admin-rewards'
import { ActionForm } from '@/components/admin/action-form'
import { FormDialog } from '@/components/admin/form-dialog'
import { FormGrid, SelectInput, TextInput } from '@/components/admin/fields'
import { ContractorFields } from '@/components/admin/contractors/contractor-fields'
import { ContractorAppPanels } from '@/components/admin/contractors/contractor-app-panels'
import { DataTable, EmptyState, fmtCurrency, fmtDate, fmtNumber, PageHeader, Panel, StatCard, StatusBadge, Td } from '@/components/admin/ui'
import {
  adjustPointsAction,
  assignGiftAction,
  contractorStatusAction,
  resetPasswordAction,
  unlockContractorAction,
  updateContractorAction,
} from '../../panel-actions'

const ACTIONS_BY_STATUS: Record<AccountStatus, { action: StatusAction; label: string; destructive?: boolean }[]> = {
  pending_approval: [
    { action: 'approve', label: 'Approve' },
    { action: 'reject', label: 'Reject', destructive: true },
  ],
  active: [
    { action: 'suspend', label: 'Suspend', destructive: true },
    { action: 'deactivate', label: 'Deactivate', destructive: true },
  ],
  suspended: [
    { action: 'reactivate', label: 'Reactivate' },
    { action: 'deactivate', label: 'Deactivate', destructive: true },
  ],
  inactive: [{ action: 'reactivate', label: 'Reactivate' }],
}

export default async function ContractorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params
  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) notFound()
  const detail = await getContractorDetail(id)
  if (!detail) notFound()
  const { contractor: c, balance, transactions, history, redemptions } = detail

  const to = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
  const [perf, gifts] = await Promise.all([getContractorPerformance(id, from, to), listGifts()])
  const assignable = gifts.filter((g) => g.status === 'active')

  return (
    <>
      <Link href="/admin/contractors" className="flex items-center gap-1.5 self-start text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />
        All contractors
      </Link>

      <PageHeader
        title={c.name}
        description={`${c.contractor_code} \u00B7 ${c.mobile} \u00B7 Joined ${fmtDate(c.joining_date)}`}
        actions={
          <FormDialog triggerLabel="Edit details" title="Edit contractor" variant="edit">
            <ActionForm action={updateContractorAction} submitLabel="Save changes">
              <input type="hidden" name="id" value={c.id} />
              <ContractorFields c={c} />
            </ActionForm>
          </FormDialog>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={c.account_status} />
        <StatusBadge status={c.verification_status} />
        {Number(c.locked) ? <StatusBadge status="suspended" /> : null}
        {Number(c.must_change_password) ? <span className="text-xs text-ink-muted">Must change password on next login</span> : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available points" value={fmtNumber(balance.available)} icon={Coins} tone="green" hint={`${fmtNumber(balance.pending)} pending`} />
        <StatCard label="Total earned" value={fmtNumber(balance.total_earned)} icon={Gift} hint={`${fmtNumber(balance.redeemed)} redeemed`} />
        <StatCard label="Sales (30 days)" value={fmtNumber(perf.sales)} icon={ShoppingBag} hint={fmtCurrency(perf.salesValue)} />
        <StatCard label="Awaiting review" value={fmtNumber(perf.pending)} icon={Clock} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Account actions" description="Status changes are logged and suspending signs the contractor out.">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {ACTIONS_BY_STATUS[c.account_status].map((a) => (
                <ActionForm key={a.action} action={contractorStatusAction} submitLabel={a.label} submitVariant={a.destructive ? 'destructive' : 'default'} inline>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="action" value={a.action} />
                </ActionForm>
              ))}
              {c.verification_status !== 'verified' && c.account_status !== 'pending_approval' ? (
                <ActionForm action={contractorStatusAction} submitLabel="Mark verified" submitVariant="outline" inline>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="action" value="verify" />
                </ActionForm>
              ) : null}
              <ActionForm action={resetPasswordAction} submitLabel="Reset password" submitVariant="outline" inline>
                <input type="hidden" name="id" value={c.id} />
              </ActionForm>
              {Number(c.locked) ? (
                <ActionForm action={unlockContractorAction} submitLabel="Unlock account" submitVariant="outline" inline>
                  <input type="hidden" name="id" value={c.id} />
                </ActionForm>
              ) : null}
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-ink-muted">Username</dt>
              <dd className="font-mono">{c.username}</dd>
              <dt className="text-ink-muted">Last login</dt>
              <dd>{c.last_login_at ? fmtDate(c.last_login_at) : 'Never'}</dd>
              <dt className="text-ink-muted">Address</dt>
              <dd>{[c.address, c.area, c.city, c.state, c.pin_code].filter(Boolean).join(', ') || '\u2014'}</dd>
            </dl>
          </div>
        </Panel>

        <Panel title="Adjust points" description="Manual credits and debits post to the ledger with your name and reason.">
          <ActionForm action={adjustPointsAction} submitLabel="Post adjustment">
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
            <FormGrid>
              <SelectInput label="Type" name="direction" options={[{ value: 'credit', label: 'Credit (add)' }, { value: 'debit', label: 'Debit (remove)' }]} />
              <SelectInput label="Currency" name="currency" options={[{ value: 'points', label: 'Points' }, { value: 'tokens', label: 'Tokens' }]} />
              <TextInput label="Amount" name="amount" type="number" min={1} required />
              <TextInput label="Reason" name="reason" required minLength={5} />
            </FormGrid>
          </ActionForm>
        </Panel>
      </div>

      <Panel title="Assign a gift" description="Reserves stock and creates an approved claim for this contractor.">
        {assignable.length === 0 ? (
          <EmptyState title="No active gifts" description="Add gifts in Rewards Engine first." />
        ) : (
          <ActionForm action={assignGiftAction} submitLabel="Assign gift" inline>
            <input type="hidden" name="id" value={c.id} />
            <SelectInput label="Gift" name="giftId" className="min-w-56 flex-1" options={assignable.map((g) => ({ value: g.id, label: `${g.name} (${fmtNumber(g.required_points)} pts)` }))} />
            <TextInput label="Note" name="note" className="min-w-56 flex-1" placeholder="Reason for assignment" />
          </ActionForm>
        )}
      </Panel>

      <ContractorAppPanels contractorId={c.id} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Ledger">
          {transactions.length === 0 ? (
            <EmptyState title="No transactions yet" />
          ) : (
            <DataTable head={['Date', 'Type', 'Amount', 'Balance', 'Reason']}>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <Td>{fmtDate(t.created_at)}</Td>
                  <Td className="capitalize">{t.entry_type.replace(/_/g, ' ')}</Td>
                  <Td className={Number(t.amount) < 0 ? 'tabular-nums text-red-700' : 'tabular-nums text-emerald-700'}>{fmtNumber(t.amount)}</Td>
                  <Td className="tabular-nums">{fmtNumber(t.available_after)}</Td>
                  <Td className="text-ink-muted">{t.reason ?? '\u2014'}</Td>
                </tr>
              ))}
            </DataTable>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Gift claims">
            {redemptions.length === 0 ? (
              <EmptyState title="No claims yet" />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {redemptions.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-ink">{r.gift_name}</p>
                      <p className="text-xs text-ink-muted">
                        {r.claim_code} &middot; {fmtNumber(r.required_points)} pts &middot; {fmtDate(r.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Account history">
            {history.length === 0 ? (
              <EmptyState title="No history yet" />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {history.map((h) => (
                  <li key={h.id} className="py-2.5 text-sm">
                    <p className="capitalize text-ink">
                      {h.action.replace(/_/g, ' ')}
                      {h.admin_name ? <span className="text-ink-muted"> by {h.admin_name}</span> : null}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {fmtDate(h.created_at)}
                      {h.note ? ` \u00B7 ${h.note}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}
