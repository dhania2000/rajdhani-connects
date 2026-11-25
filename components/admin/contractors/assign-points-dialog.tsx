'use client'

import { useId, useMemo, useState } from 'react'
import { Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ActionForm } from '@/components/admin/action-form'
import type { ProductOption } from '@/lib/server/catalogue-admin'
import { assignPointsAction } from '@/app/admin/(panel)/panel-actions'

const inputClass = 'h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink outline-none focus:border-brand'

/**
 * "Assign Points" for one contractor: pick a catalogue product (optional), choose Add Points or
 * Bonus Points, and enter the points to credit. Picking a product pre-fills its points per unit.
 */
export function AssignPointsDialog({ contractor, products }: { contractor: { id: number; name: string; mobile: string }; products: ProductOption[] }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [productId, setProductId] = useState('')
  const [points, setPoints] = useState('')
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

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setProductId('')
      setPoints('')
      setKey(crypto.randomUUID())
    }
  }

  function pickProduct(value: string) {
    setProductId(value)
    const p = products.find((x) => String(x.id) === value)
    if (p?.points != null) setPoints(String(p.points))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button size="sm" className="h-9 px-3" />}>
        <Coins aria-hidden="true" />
        Assign Points
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign points to {contractor.name}</DialogTitle>
          <DialogDescription>
            {contractor.mobile} &middot; Points are added to the contractor&apos;s balance right away and they get a notification.
          </DialogDescription>
        </DialogHeader>
        <ActionForm action={assignPointsAction} submitLabel="Assign points">
          <input type="hidden" name="id" value={contractor.id} />
          <input type="hidden" name="idempotencyKey" value={key} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-product`} className="text-sm font-medium text-ink">
              Product
            </label>
            <select id={`${id}-product`} name="productId" value={productId} onChange={(e) => pickProduct(e.target.value)} className={inputClass}>
              <option value="">No specific product</option>
              {Object.entries(groups).map(([category, items]) => (
                <optgroup key={category} label={category}>
                  {items.map((p) => (
                    <option key={p.id} value={p.id}>
                      {[p.brand, p.name].filter(Boolean).join(' ')}
                      {p.points != null ? ` (${p.points} pts/unit)` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            {products.length === 0 ? <p className="text-xs text-ink-muted">No products yet. Add them in Rewards Engine &gt; Product Catalogue.</p> : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                onChange={(e) => setPoints(e.target.value)}
                placeholder="e.g. 100"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-note`} className="text-sm font-medium text-ink">
              Note (optional)
            </label>
            <input id={`${id}-note`} name="note" maxLength={200} placeholder="e.g. 10 bags at Sharma site" className={inputClass} />
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  )
}
