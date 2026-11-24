import Link from 'next/link'
import { ENQUIRY_STATUSES, listCartRequests } from '@/lib/server/enquiries'
import { CartRequestEditor } from './cart-request-editor'
import { EmptyState, fmtCurrency, fmtDate, fmtNumber, Panel, StatusBadge } from '@/components/admin/ui'
import { rewardHref } from '@/lib/admin-nav'
import { cn } from '@/lib/utils'

const label = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : 'All')

/** Products contractors sent from their cart; the admin follows up and records the sale. */
export async function CartRequestsTab({ status = '' }: { status?: string }) {
  const rows = await listCartRequests(status || undefined)

  return (
    <Panel
      title="Cart requests"
      description="Contractors add catalogue products to a cart and send it to the store. Set the final quantities the customer bought, then Complete: sales are added to Sales automatically and points are credited."
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

              <div className="mt-3">
                {r.status === 'new' || r.status === 'contacted' ? (
                  <CartRequestEditor
                    requestId={r.id}
                    status={r.status}
                    lines={r.items.map((i) => ({
                      id: i.id,
                      name: [i.brand, i.product_name].filter(Boolean).join(' '),
                      category: i.category_name,
                      unit: i.unit,
                      quantity: Number(i.quantity),
                      pointsPerUnit: i.points_per_unit === null ? null : Number(i.points_per_unit),
                      amount: i.amount === null ? null : Number(i.amount),
                    }))}
                  />
                ) : (
                  <table className="w-full text-left text-[13px]">
                    <thead className="text-[11px] uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="py-1 font-semibold">Product</th>
                        <th className="py-1 font-semibold">Qty</th>
                        <th className="py-1 font-semibold">Amount</th>
                        <th className="py-1 text-right font-semibold">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {r.items.map((i) => (
                        <tr key={i.id}>
                          <td className="py-1.5">
                            {[i.brand, i.product_name].filter(Boolean).join(' ')}
                            {i.activity_id ? (
                              <Link href={rewardHref('activities', { q: r.enquiry_code })} className="ml-1.5 text-xs text-brand hover:underline">
                                View sale
                              </Link>
                            ) : null}
                          </td>
                          <td className="py-1.5 tabular-nums">
                            {fmtNumber(i.quantity)} {i.unit ?? ''}
                          </td>
                          <td className="py-1.5 tabular-nums">{i.amount !== null ? fmtCurrency(i.amount) : '—'}</td>
                          <td className="py-1.5 text-right tabular-nums">
                            {i.points_per_unit !== null ? fmtNumber(Number(i.points_per_unit) * Number(i.quantity)) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {r.note ? <p className="mt-2 rounded-lg bg-app-bg px-3 py-2 text-xs text-ink">Contractor note: {r.note}</p> : null}
              {r.admin_note ? <p className="mt-2 text-xs text-ink-muted">Store note: {r.admin_note}</p> : null}
              {r.status === 'completed' ? (
                <p className="mt-2 text-xs text-emerald-700">Completed: sales recorded and points credited. Record any returns on the sale under Sales.</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
