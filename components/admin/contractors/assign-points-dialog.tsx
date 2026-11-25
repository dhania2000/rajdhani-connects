'use client'

import { useId, useMemo, useState } from 'react'
import { Coins, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ActionForm } from '@/components/admin/action-form'
import type { ProductOption } from '@/lib/server/catalogue-admin'
import { assignPointsAction } from '@/app/admin/(panel)/panel-actions'

const inputClass = 'h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink outline-none focus:border-brand'
const fmt = (n: number) => n.toLocaleString('en-IN')
const unitLabel = (unit: string) => unit.replace(/^per\s+/i, '')

/**
 * "Assign Points" for one contractor, laid out like the contractor app's catalogue: add products
 * with quantities, and the points (points per unit x quantity) add up automatically. The admin can
 * still overwrite the total, and chooses Add Points or Bonus Points.
 */
export function AssignPointsDialog({ contractor, products }: { contractor: { id: number; name: string; mobile: string }; products: ProductOption[] }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [qty, setQty] = useState<Record<number, number>>({})
  const [manualPoints, setManualPoints] = useState<string | null>(null)
  // A fresh key per opening so a resubmitted form never credits twice.
  const [key, setKey] = useState(() => crypto.randomUUID())

  const groups = useMemo(
    () =>
      products.reduce<Record<string, ProductOption[]>>((acc, p) => {
        ;(acc[p.category] ??= []).push(p)
        return acc
      }, {}),
    [products],
  )

  const autoPoints = products.reduce((n, p) => n + (p.points ?? 0) * (qty[p.id] ?? 0), 0)
  const points = manualPoints ?? (autoPoints > 0 ? String(autoPoints) : '')
  const picked = products.filter((p) => (qty[p.id] ?? 0) > 0)

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setQty({})
      setManualPoints(null)
      setKey(crypto.randomUUID())
    }
  }

  const setQuantity = (pid: number, q: number) => setQty((prev) => ({ ...prev, [pid]: Math.max(0, Math.floor(q) || 0) }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button size="sm" className="h-9 px-3" />}>
        <Coins aria-hidden="true" />
        Assign Points
      </DialogTrigger>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign points to {contractor.name}</DialogTitle>
          <DialogDescription>{contractor.mobile} &middot; Add products to work out the points, or just type the points below.</DialogDescription>
        </DialogHeader>
        <ActionForm action={assignPointsAction} submitLabel="Assign points" className="min-h-0 flex-1">
          <input type="hidden" name="id" value={contractor.id} />
          <input type="hidden" name="idempotencyKey" value={key} />
          {picked.map((p) => (
            <input key={p.id} type="hidden" name={`qty_${p.id}`} value={qty[p.id]} />
          ))}

          <div className="-mx-1 max-h-[46vh] overflow-y-auto px-1">
            {products.length === 0 ? (
              <p className="rounded-lg bg-app-bg p-3 text-sm text-ink-muted">No products yet. Add them in Rewards Engine &gt; Product Catalogue.</p>
            ) : (
              Object.entries(groups).map(([category, items]) => (
                <section key={category} className="mb-3">
                  <h3 className="mb-2 text-sm font-semibold text-ink">{category}</h3>
                  <ul className="flex flex-col gap-2">
                    {items.map((p) => {
                      const q = qty[p.id] ?? 0
                      return (
                        <li key={p.id} className={`flex items-center gap-3 rounded-xl border p-2.5 ${q > 0 ? 'border-brand/40 bg-lavender/40' : 'border-border bg-white'}`}>
                          <span className="size-14 shrink-0 overflow-hidden rounded-lg bg-app-bg">
                            {p.image ? <img src={p.image} alt="" className="size-full object-cover" /> : null}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                            <p className="truncate text-xs text-ink-muted">{[p.brand, p.unit].filter(Boolean).join(' · ')}</p>
                            {p.points != null ? (
                              <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                {fmt(p.points)} pts{p.unit ? ` / ${unitLabel(p.unit)}` : ''}
                              </span>
                            ) : (
                              <span className="mt-1 inline-block text-[11px] text-ink-muted">No points set</span>
                            )}
                          </div>
                          {q === 0 ? (
                            <Button type="button" size="sm" className="h-8 shrink-0 rounded-full px-3" onClick={() => setQuantity(p.id, 1)}>
                              <Plus aria-hidden="true" />
                              Add
                            </Button>
                          ) : (
                            <div className="flex shrink-0 items-center rounded-full border border-brand/30 bg-white" role="group" aria-label={`${p.name} quantity`}>
                              <button type="button" onClick={() => setQuantity(p.id, q - 1)} className="flex size-8 items-center justify-center text-brand" aria-label="Decrease quantity">
                                <Minus className="size-3.5" />
                              </button>
                              <input
                                type="number"
                                min={0}
                                inputMode="numeric"
                                value={q}
                                onChange={(e) => setQuantity(p.id, Number(e.target.value))}
                                aria-label={`${p.name} quantity`}
                                className="w-12 bg-transparent text-center text-sm font-bold text-brand tabular-nums outline-none"
                              />
                              <button type="button" onClick={() => setQuantity(p.id, q + 1)} className="flex size-8 items-center justify-center text-brand" aria-label="Increase quantity">
                                <Plus className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>

          {picked.length > 0 ? (
            <p className="rounded-lg bg-app-bg px-3 py-2 text-xs text-ink">
              {picked.map((p) => `${qty[p.id]} × ${p.name}`).join(', ')}
              {autoPoints > 0 ? <span className="font-semibold text-brand"> = {fmt(autoPoints)} pts</span> : null}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-type`} className="text-sm font-medium text-ink">
                Points type
              </label>
              <select id={`${id}-type`} name="pointType" defaultValue="add" className={inputClass}>
                <option value="add">Add Points</option>
                <option value="bonus">Bonus Points</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-points`} className="text-sm font-medium text-ink">
                Points
              </label>
              <input
                id={`${id}-points`}
                name="points"
                type="number"
                min={1}
                step={1}
                required
                value={points}
                onChange={(e) => setManualPoints(e.target.value)}
                placeholder="e.g. 100"
                className={inputClass}
              />
              {manualPoints !== null && autoPoints > 0 && Number(manualPoints) !== autoPoints ? (
                <button type="button" onClick={() => setManualPoints(null)} className="self-start text-[11px] text-brand hover:underline">
                  Use calculated {fmt(autoPoints)}
                </button>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-note`} className="text-sm font-medium text-ink">
                Note (optional)
              </label>
              <input id={`${id}-note`} name="note" maxLength={200} placeholder="e.g. Sharma site" className={inputClass} />
            </div>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  )
}
