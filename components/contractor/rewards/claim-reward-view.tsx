'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatNumber, formatPoints } from '@/lib/format'
import type { Gift, RewardClaim } from '@/lib/types'
import { useContractor } from '@/components/contractor/contractor-store'
import { ConfirmationDialog } from '@/components/contractor/shared/confirmation-dialog'
import { availabilityLabel } from './gift-card'
import { cn } from '@/lib/utils'

export function ClaimRewardView({ gift }: { gift: Gift }) {
  const { availablePoints, claims, claimGift } = useContractor()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<RewardClaim | null>(null)
  const submitting = useRef(false)

  const shortfall = gift.points - availablePoints
  const outOfStock = gift.availability === 'out-of-stock'
  const hasPending = claims.some((c) => c.giftId === gift.id && c.status === 'requested')
  const eligible = shortfall <= 0 && !outOfStock && !hasPending
  const avail = availabilityLabel[gift.availability]

  const confirm = () => {
    if (submitting.current) return
    submitting.current = true
    setBusy(true)
    setTimeout(() => {
      const result = claimGift(gift)
      if (result.ok) setSuccess(result.claim)
      else setError(result.reason)
      setBusy(false)
      setOpen(false)
      submitting.current = false
    }, 700)
  }

  if (success) {
    return (
      <main className="flex flex-col items-center gap-3 p-6 text-center">
        <span className="mt-6 flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="size-9" aria-hidden="true" />
        </span>
        <h2 className="text-lg font-bold text-ink">Request submitted</h2>
        <p className="text-sm text-ink-muted">
          Your request <span className="font-semibold text-ink">{success.id}</span> for {gift.name} has been recorded.{' '}
          {formatPoints(gift.points)} were reserved from your balance. This is a demo — no real order is placed.
        </p>
        <div className="mt-3 grid w-full grid-cols-2 gap-2.5">
          <Link href="/contractor/rewards/catalogue" className="flex h-11 items-center justify-center rounded-lg border border-border bg-white text-sm font-semibold text-ink">
            More Gifts
          </Link>
          <Link href="/contractor/rewards/claims" className="flex h-11 items-center justify-center rounded-lg bg-brand-strong text-sm font-semibold text-white">
            Track Claim
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-4 p-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-white shadow-[0_1px_4px_rgba(28,35,64,0.08)]">
        <Image src={gift.image} alt={gift.name} fill sizes="420px" className="object-contain p-6" priority />
      </div>

      <section className="rounded-xl bg-white p-4 shadow-[0_1px_4px_rgba(28,35,64,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">{gift.name}</h2>
          <span className={cn('shrink-0 text-xs font-semibold', avail.className)}>{avail.label}</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">{gift.description}</p>

        <dl className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-lg bg-lavender p-3">
            <dt className="text-[11px] text-ink-muted">Points Required</dt>
            <dd className="text-[15px] font-bold text-brand">{formatPoints(gift.points)}</dd>
          </div>
          <div className="rounded-lg bg-app-bg p-3">
            <dt className="text-[11px] text-ink-muted">Available Balance</dt>
            <dd className="text-[15px] font-bold text-ink">{formatPoints(availablePoints)}</dd>
          </div>
        </dl>

        <div
          className={cn(
            'mt-3 flex items-start gap-2 rounded-lg p-3 text-[13px]',
            eligible ? 'bg-success/10 text-[#047857]' : 'bg-warn/10 text-[#92400e]',
          )}
          role="status"
        >
          {eligible ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
          <span>
            {eligible
              ? 'You are eligible to redeem this gift.'
              : outOfStock
                ? 'This gift is currently out of stock.'
                : hasPending
                  ? 'You already have a pending request for this gift.'
                  : `Insufficient balance — you need ${formatNumber(shortfall)} more points.`}
          </span>
        </div>

        {error && (
          <p className="mt-3 text-[13px] font-medium text-danger" role="alert">
            {error}
          </p>
        )}
      </section>

      <button
        type="button"
        disabled={!eligible}
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
        className="h-12 rounded-xl bg-brand-strong text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-brand disabled:cursor-not-allowed disabled:bg-[#c9c3e8]"
      >
        Confirm Redemption
      </button>

      <ConfirmationDialog
        open={open}
        busy={busy}
        title="Confirm redemption?"
        description={
          <>
            Redeem <strong className="text-ink">{gift.name}</strong> for {formatPoints(gift.points)}. Your balance after
            this request will be {formatPoints(availablePoints - gift.points)}.
          </>
        }
        confirmLabel="Yes, Redeem"
        onConfirm={confirm}
        onCancel={() => setOpen(false)}
      />
    </main>
  )
}
