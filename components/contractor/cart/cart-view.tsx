'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Minus, Plus, Send, ShoppingCart, Trash2 } from 'lucide-react'
import { submitCartRequestAction } from '@/app/contractor/actions'
import { formatDate, formatNumber } from '@/lib/format'
import type { CartRequest } from '@/lib/types'
import { useContractor } from '@/components/contractor/contractor-store'
import { EmptyState } from '@/components/contractor/shared/empty-state'
import { SectionTitle } from '@/components/contractor/shared/section-title'
import { useCart } from './cart-store'

const STATUS_LABEL: Record<CartRequest['status'], { className: string; text: string }> = {
  new: { className: 'bg-info/10 text-info', text: 'Sent' },
  contacted: { className: 'bg-warn/15 text-[#92400e]', text: 'In progress' },
  completed: { className: 'bg-success/10 text-[#047857]', text: 'Completed' },
  cancelled: { className: 'bg-danger/10 text-[#b42318]', text: 'Cancelled' },
}

export function CartView({ requests }: { requests: CartRequest[] }) {
  const router = useRouter()
  const { items, estimatedPoints, setQuantity, remove, clear } = useCart()
  const { formatPts } = useContractor()
  const [customerName, setCustomerName] = useState('')
  const [customerMobile, setCustomerMobile] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const key = useRef<string>(crypto.randomUUID())

  async function send() {
    setBusy(true)
    setError(null)
    try {
      const result = await submitCartRequestAction({
        idempotencyKey: key.current,
        customerName,
        customerMobile,
        note,
        items: items.map((i) => ({ productId: Number(i.productId), quantity: i.quantity })),
      })
      if (!result.ok) return setError(result.error)
      key.current = crypto.randomUUID()
      clear()
      setCustomerName('')
      setCustomerMobile('')
      setNote('')
      setSent(result.code || 'your request')
      router.refresh()
    } catch {
      setError('Could not send right now. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex flex-col gap-4 p-4">
      {sent && (
        <div role="status" className="flex items-start gap-2 rounded-xl bg-success/10 p-3 text-[13px] text-[#047857]">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Request <span className="font-semibold">{sent}</span> sent to the store. They will contact you, and points are credited once the sale is recorded.
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          description="Add products from the catalogue to see the points you can earn and send them to the store."
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2.5">
            {items.map((i) => (
              <li key={i.productId} className="flex gap-3 rounded-xl bg-white p-3 shadow-[0_1px_3px_rgba(28,35,64,0.08)]">
                <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-app-bg">
                  {i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{i.name}</p>
                    <button type="button" onClick={() => remove(i.productId)} className="text-ink-muted" aria-label={`Remove ${i.name}`}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <p className="text-[12px] text-ink-muted">{[i.brand, i.unit].filter(Boolean).join(' · ')}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="inline-flex h-8 items-center rounded-full border border-border" role="group" aria-label={`${i.name} quantity`}>
                      <button type="button" onClick={() => setQuantity(i.productId, i.quantity - 1)} className="flex size-8 items-center justify-center" aria-label="Decrease quantity">
                        <Minus className="size-3.5" />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        value={i.quantity}
                        onChange={(e) => setQuantity(i.productId, Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                        className="w-10 bg-transparent text-center text-[13px] font-bold tabular-nums outline-none"
                        aria-label="Quantity"
                      />
                      <button type="button" onClick={() => setQuantity(i.productId, i.quantity + 1)} className="flex size-8 items-center justify-center" aria-label="Increase quantity">
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    {i.points ? (
                      <p className="text-[12px] font-semibold text-brand">~{formatPts(Math.round(i.points * i.quantity))}</p>
                    ) : (
                      <p className="text-[11px] text-ink-muted">Points set by store</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <section className="rounded-xl border border-[#cfc0f5] bg-gradient-to-br from-[#efe4ff] to-[#f6f0ff] p-4">
            <p className="text-[13px] text-ink">Estimated points</p>
            <p className="text-[24px] font-extrabold text-brand">{formatPts(estimatedPoints)}</p>
            <p className="text-[11px] text-ink-muted">Final points are credited by the store when the sale is recorded.</p>
          </section>

          <section className="flex flex-col gap-2.5 rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(28,35,64,0.08)]">
            <SectionTitle>Send to store</SectionTitle>
            <label className="text-[12px] font-medium text-ink-muted">
              Customer name (optional)
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={150} className="mt-1 h-10 w-full rounded-lg border border-border px-3 text-sm text-ink" />
            </label>
            <label className="text-[12px] font-medium text-ink-muted">
              Customer mobile (optional)
              <input
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                type="tel"
                inputMode="tel"
                maxLength={20}
                className="mt-1 h-10 w-full rounded-lg border border-border px-3 text-sm text-ink"
              />
            </label>
            <label className="text-[12px] font-medium text-ink-muted">
              Note for the store (optional)
              <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-ink" />
            </label>
            {error && (
              <p role="alert" className="text-[13px] text-danger">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-strong text-sm font-semibold text-white disabled:opacity-70"
            >
              <Send className="size-4" aria-hidden="true" />
              {busy ? 'Sending…' : 'Send request to store'}
            </button>
          </section>
        </>
      )}

      {items.length === 0 && (
        <Link href="/contractor/catalogue" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-strong text-sm font-semibold text-white">
          <ShoppingCart className="size-4" aria-hidden="true" />
          Browse catalogue
        </Link>
      )}

      {requests.length > 0 && (
        <section>
          <SectionTitle>My requests</SectionTitle>
          <ul className="flex flex-col gap-2.5">
            {requests.map((r) => (
              <li key={r.id} className="rounded-xl bg-white p-3.5 shadow-[0_1px_3px_rgba(28,35,64,0.08)]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{r.id}</p>
                    <p className="text-[11px] text-ink-muted">
                      {formatDate(r.createdOn)}
                      {r.customerName ? ` · ${r.customerName}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_LABEL[r.status].className}`}>
                    {STATUS_LABEL[r.status].text}
                  </span>
                </div>
                <ul className="mt-1.5 text-[12px] text-ink-muted">
                  {r.items.map((i, idx) => (
                    <li key={idx}>
                      {formatNumber(i.quantity)} × {i.name}
                      {i.unit ? ` (${i.unit})` : ''}
                    </li>
                  ))}
                </ul>
                {r.estimatedPoints > 0 && <p className="mt-1.5 text-[12px] font-semibold text-brand">~{formatPts(r.estimatedPoints)}</p>}
                {r.adminNote && <p className="mt-1.5 rounded-lg bg-app-bg px-2.5 py-1.5 text-[12px] text-ink">Store: {r.adminNote}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
