import Link from 'next/link'
import { listRedemptions, nextRedemptionStatuses } from '@/lib/server/admin-rewards'
import { ActionForm } from '@/components/admin/action-form'
import { SelectInput } from '@/components/admin/fields'
import { DataTable, EmptyState, fmtDate, fmtNumber, Panel, StatusBadge, Td } from '@/components/admin/ui'
import { redemptionAction } from '@/app/admin/(panel)/panel-actions'
import { cn } from '@/lib/utils'

const FILTERS = ['', 'requested', 'under_review', 'approved', 'ready_for_handover', 'delivered', 'completed', 'rejected', 'cancelled']
const label = (s: string) => (s ? s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : 'All')

export async function RedemptionsTab({ status = '' }: { status?: string }) {
  const rows = await listRedemptions(status || undefined)

  return (
    <Panel title="Redemption requests" description="Required balance is reserved while a claim is open, released on rejection/cancellation, and redeemed on delivery.">
      <nav aria-label="Filter claims" className="mb-4 flex flex-wrap gap-1">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/admin/rewards-engine/redemptions${f ? `?status=${f}` : ''}`}
            aria-current={status === f ? 'page' : undefined}
            className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', status === f ? 'bg-brand text-white' : 'text-ink-muted hover:bg-app-bg hover:text-ink')}
          >
            {label(f)}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState title="No claims found" />
      ) : (
        <DataTable head={['Claim', 'Contractor', 'Gift', 'Required', 'Requested', 'Status', 'Next step']}>
          {rows.map((r) => {
            const next = nextRedemptionStatuses(r.status)
            return (
              <tr key={r.id}>
                <Td className="font-mono text-xs">{r.claim_code}</Td>
                <Td>
                  <Link href={`/admin/contractors/${r.contractor_id}`} className="font-medium hover:text-brand">
                    {r.contractor_name}
                  </Link>
                  <p className="text-xs text-ink-muted">{r.contractor_mobile}</p>
                </Td>
                <Td>{r.gift_name}</Td>
                <Td className="text-xs tabular-nums">
                  {fmtNumber(r.required_points)} pts / {fmtNumber(r.required_tokens)} tok
                </Td>
                <Td>{fmtDate(r.created_at)}</Td>
                <Td>
                  <StatusBadge status={r.status} />
                  {r.rejection_reason ? <p className="mt-1 text-xs text-ink-muted">{r.rejection_reason}</p> : null}
                  {r.handover_reference ? <p className="mt-1 text-xs text-ink-muted">Ref: {r.handover_reference}</p> : null}
                </Td>
                <Td>
                  {next.length === 0 ? (
                    <span className="text-xs text-ink-muted">Closed</span>
                  ) : (
                    <ActionForm action={redemptionAction} submitLabel="Update" inline className="min-w-72">
                      <input type="hidden" name="id" value={r.id} />
                      <SelectInput label="Move to" name="to" options={next.map((s) => ({ value: s, label: label(s) }))} />
                      <input name="note" aria-label="Note or rejection reason" placeholder="Note / reason" className="h-10 w-36 rounded-lg border border-border px-2 text-sm" />
                      <input name="handoverReference" aria-label="Handover reference" placeholder="Handover ref" className="h-10 w-28 rounded-lg border border-border px-2 text-sm" />
                    </ActionForm>
                  )}
                </Td>
              </tr>
            )
          })}
        </DataTable>
      )}
    </Panel>
  )
}
