import Link from 'next/link'
import { ENQUIRY_STATUSES, listCartRequests } from '@/lib/server/enquiries'
import { ActionForm } from '@/components/admin/action-form'
import { SelectInput } from '@/components/admin/fields'
import { EmptyState, fmtDate, fmtNumber, Panel, StatusBadge } from '@/components/admin/ui'
import { cartRequestStatusAction } from '@/app/admin/(panel)/panel-actions'
import { rewardHref } from '@/lib/admin-nav'
import { cn } from '@/lib/utils'

const label = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : 'All')

/** Products contractors sent from their cart; the admin follows up and records the sale. */
export async function CartRequestsTab({ status = '' }: { status?: string }) {
  const rows = await listCartRequests(status || undefined)

  return (
    <Panel
      title="Cart requests"
      description="Contractors add catalogue products to a cart and send it to the store. Points shown are estimates; credit them by adding the sale under Sales once the customer buys."
    >
      <nav aria-label="Filter requests" className="mb-4 flex flex-wrap gap-1">
        {['', ...ENQUIRY_STATUSES].map((f) => (
          <Link
            key={f}
            href={rewardHref('cart-requests', { status: f || undefined })}
            aria-current={status === f ? 'page' : undefined}
            className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', status === f ? 'bg-brand text-white' : 'text-ink-muted hover:bg-app-bg hover:text-ink')}
          >
            {label(f)}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <EmptyState title="No cart requests" description="Requests contractors send from the Product Catalogue appear here." />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-[10px] border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">
                    <span className="font-mono text-xs text-ink-muted">{r.enquiry_code}</span>{' '}
                    <Link href={`/admin/contractors/${r.contractor_id}`} className="hover:text-brand">
                      {r.contractor_name}
                    </Link>{' '}
                    <span className="text-xs text-ink-muted">
                      ({r.contractor_code} &middot; {r.contractor_mobile})
                    </span>
                  </p>
                  <p className="text-xs text-ink-muted">
                    {fmtDate(r.created_at)}
                    {r.customer_name ? ` · Customer: ${r.customer_name}` : ''}
                    {r.customer_mobile ? ` (${r.customer_mobile})` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-lavender px-2.5 py-0.5 text-xs font-semibold text-brand">~{fmtNumber(r.estimated_points)} pts</span>
                  <StatusBadge status={r.status === 'new' ? 'requested' : r.status === 'contacted' ? 'under_review' : r.status} />
                </div>
              </div>

              <table className="mt-3 w-full text-left text-[13px]">
                <thead className="text-[11px] uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="py-1 font-semibold">Product</th>
                    <th className="py-1 font-semibold">Qty</th>
                    <th className="py-1 text-right font-semibold">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {r.items.map((i, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5">
                        {[i.brand, i.product_name].filter(Boolean).join(' ')}
                        {i.category_name ? <span className="text-xs text-ink-muted"> &middot; {i.category_name}</span> : null}
                      </td>
                      <td className="py-1.5 tabular-nums">
                        {fmtNumber(i.quantity)} {i.unit ?? ''}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {i.points_per_unit !== null ? fmtNumber(Number(i.points_per_unit) * Number(i.quantity)) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {r.note ? <p className="mt-2 rounded-lg bg-app-bg px-3 py-2 text-xs text-ink">Note: {r.note}</p> : null}
              {r.admin_note ? <p className="mt-2 text-xs text-ink-muted">Store note: {r.admin_note}</p> : null}

              <div className="mt-3 border-t border-border pt-3">
                <ActionForm action={cartRequestStatusAction} submitLabel="Update" inline>
                  <input type="hidden" name="id" value={r.id} />
                  <SelectInput
                    label="Status"
                    name="status"
                    defaultValue={r.status === 'new' ? 'contacted' : r.status}
                    options={ENQUIRY_STATUSES.map((s) => ({ value: s, label: label(s) }))}
                  />
                  <input name="note" aria-label="Note for the contractor" placeholder="Note for the contractor (optional)" className="h-10 min-w-56 flex-1 rounded-lg border border-border px-3 text-sm" />
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
