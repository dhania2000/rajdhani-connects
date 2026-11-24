'use client'

import { useState } from 'react'
import { ActionForm } from '@/components/admin/action-form'
import { cartRequestStatusAction } from '@/app/admin/(panel)/panel-actions'

interface Line {
  id: number
  name: string
  category: string | null
  unit: string | null
  quantity: number
  pointsPerUnit: number | null
  amount: number | null
}

const fmt = (n: number) => n.toLocaleString('en-IN')

/**
 * Editable lines for an open cart request: the admin sets the final quantity bought (0 removes the
 * product) and optional amount, then saves or completes. Points preview = points per unit x quantity.
 */
export function CartRequestEditor({ requestId, status, lines }: { requestId: number; status: 'new' | 'contacted'; lines: Line[] }) {
  const [qty, setQty] = useState<Record<number, string>>(() => Object.fromEntries(lines.map((l) => [l.id, String(l.quantity)])))
  const points = (l: Line) => (l.pointsPerUnit === null ? null : Math.round(l.pointsPerUnit * (Number(qty[l.id]) || 0)))
  const total = lines.reduce((n, l) => n + (points(l) ?? 0), 0)
  const kept = lines.filter((l) => Number(qty[l.id]) > 0).length

  return (
    <ActionForm action={cartRequestStatusAction} submitLabel="Apply">
      <input type="hidden" name="id" value={requestId} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="py-1 font-semibold">Product</th>
              <th className="py-1 font-semibold">Final qty</th>
              <th className="py-1 font-semibold">Amount (₹, optional)</th>
              <th className="py-1 text-right font-semibold">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lines.map((l) => {
              const removed = !(Number(qty[l.id]) > 0)
              const p = points(l)
              return (
                <tr key={l.id} className={removed ? 'opacity-50' : undefined}>
                  <td className="py-2 pr-3">
                    <span className={removed ? 'line-through' : undefined}>{l.name}</span>
                    {l.category ? <span className="text-xs text-ink-muted"> &middot; {l.category}</span> : null}
                    {removed ? <span className="block text-xs text-red-700">Will be removed</span> : null}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1.5">
                      <input
                        name={`qty_${l.id}`}
                        type="number"
                        min={0}
                        step="any"
                        value={qty[l.id]}
                        onChange={(e) => setQty((q) => ({ ...q, [l.id]: e.target.value }))}
                        aria-label={`Final quantity for ${l.name}`}
                        className="h-9 w-20 rounded-lg border border-border px-2 text-sm tabular-nums"
                      />
                      <span className="text-xs text-ink-muted">{l.unit ? `× ${l.unit.replace(/^per\s+/i, '')}` : ''}</span>
                    </div>
                    {Number(qty[l.id]) !== l.quantity ? <span className="text-[11px] text-ink-muted">Requested {fmt(l.quantity)}</span> : null}
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      name={`amount_${l.id}`}
                      type="number"
                      min={0}
                      step="0.01"
                      defaultValue={l.amount ?? ''}
                      aria-label={`Amount for ${l.name}`}
                      className="h-9 w-28 rounded-lg border border-border px-2 text-sm tabular-nums"
                    />
                  </td>
                  <td className="py-2 text-right tabular-nums">{p === null ? <span className="text-xs text-ink-muted">By rules</span> : fmt(p)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-2 text-right text-xs text-ink-muted">
                Points to credit on completion
              </td>
              <td className="pt-2 text-right font-semibold tabular-nums">{fmt(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr]">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Action
          <select name="intent" defaultValue={status === 'new' ? 'contacted' : 'complete'} className="h-10 rounded-lg border border-border bg-white px-3 text-sm">
            <option value="complete" disabled={kept === 0}>
              Complete &amp; add to sales
            </option>
            <option value="contacted">Save &amp; mark contacted</option>
            <option value="save">Save changes only</option>
            <option value="cancelled">Cancel request</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Note for the contractor (optional)
          <input name="note" className="h-10 rounded-lg border border-border px-3 text-sm font-normal" placeholder="e.g. Customer took 8 bags" />
        </label>
      </div>
      <p className="text-xs text-ink-muted">
        Completing adds {kept} sale{kept === 1 ? '' : 's'} to Sales (approved) and credits {fmt(total)} points to the contractor. It can only be done once;
        later returns are recorded on the sale.
      </p>
    </ActionForm>
  )
}
