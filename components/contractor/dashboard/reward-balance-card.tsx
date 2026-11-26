'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronRight, Target } from 'lucide-react'
import { useContractor } from '@/components/contractor/contractor-store'
import { GiftBoxIcon } from '@/components/contractor/shared/gift-box-icon'

export interface GoalGift {
  id: string
  name: string
  points: number
  image: string
}

export function RewardBalanceCard({ gifts = [] }: { gifts?: GoalGift[] }) {
  const { availablePoints, content, formatPts } = useContractor()

  return (
    <section
      aria-label={content.rewardCardTitle}
      className="relative overflow-hidden rounded-xl border border-[#cfc0f5] bg-gradient-to-br from-[#efe4ff] via-[#f3ebff] to-[#e9defc]"
    >
      <div className="flex items-center gap-3 px-4 py-3.5 max-[340px]:gap-2 max-[340px]:px-3">
        <GiftBoxIcon className="size-[52px] shrink-0 max-[340px]:size-11" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink">{content.rewardCardTitle}</p>
          <p className="text-[26px] leading-tight font-extrabold tracking-tight text-ink">{formatPts(availablePoints)}</p>
          <div className="flex items-end justify-between gap-2">
            <p className="text-[12px] whitespace-nowrap text-ink-muted max-[340px]:text-[11px]">(Available Value)</p>
            <Link
              href="/contractor/rewards/catalogue?filter=redeemable"
              className="-mt-3 inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-brand-strong pr-2.5 pl-3.5 text-[13px] max-[340px]:pl-2.5 max-[340px]:text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {content.redeemButtonText}
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
      {gifts.length > 0 ? <GiftGoals gifts={gifts} available={availablePoints} formatPts={formatPts} /> : null}
    </section>
  )
}

const SPEED_PX_PER_SEC = 28
const RESUME_AFTER_MS = 2500

/**
 * Every in-stock gift (cheapest first) with how many points are still needed, in a strip that
 * keeps scrolling to the left. The contractor can also swipe it; auto-scroll pauses while they do.
 */
function GiftGoals({ gifts, available, formatPts }: { gifts: GoalGift[]; available: number; formatPts: (n: number) => string }) {
  const sorted = [...gifts].sort((a, b) => a.points - b.points)
  const ready = sorted.filter((g) => g.points <= available).length
  const scroller = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const loop = sorted.length > 1

  useEffect(() => {
    const el = scroller.current
    if (!el || !loop) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    let last = performance.now()
    let pausedUntil = 0
    let pos = el.scrollLeft
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100)
      last = now
      const half = listRef.current ? listRef.current.scrollWidth / 2 : 0
      if (now >= pausedUntil && half > el.clientWidth / 2) {
        pos += (SPEED_PX_PER_SEC * dt) / 1000
        // The list is rendered twice; jumping back by one copy makes the loop seamless.
        if (pos >= half) pos -= half
        el.scrollLeft = pos
      } else {
        pos = el.scrollLeft
        if (half > 0 && pos >= half) {
          pos -= half
          el.scrollLeft = pos
        }
      }
      raf = requestAnimationFrame(tick)
    }
    const pause = () => {
      pausedUntil = performance.now() + RESUME_AFTER_MS
    }
    raf = requestAnimationFrame(tick)
    el.addEventListener('pointerdown', pause)
    el.addEventListener('touchstart', pause, { passive: true })
    el.addEventListener('wheel', pause, { passive: true })
    el.addEventListener('focusin', pause)
    const onScroll = () => {
      if (performance.now() < pausedUntil) pause()
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointerdown', pause)
      el.removeEventListener('touchstart', pause)
      el.removeEventListener('wheel', pause)
      el.removeEventListener('focusin', pause)
      el.removeEventListener('scroll', onScroll)
    }
  }, [loop])

  const copies = loop ? [0, 1] : [0]

  return (
    <div className="border-t border-[#d9ccf7] bg-white/55 pt-2.5 pb-3">
      <p className="flex items-center gap-1.5 px-4 text-[12px] font-semibold text-ink max-[340px]:px-3">
        <Target className="size-3.5 text-brand" aria-hidden="true" />
        Gifts you can win
        {ready > 0 ? (
          <span className="ml-auto rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
            {ready} ready to redeem
          </span>
        ) : null}
      </p>
      <div
        ref={scroller}
        className="mt-2 overflow-x-auto px-4 [scrollbar-width:none] max-[340px]:px-3 [&::-webkit-scrollbar]:hidden"
        aria-label="Gifts and the points still needed"
        role="region"
      >
        <ul ref={listRef} className="flex w-max gap-2">
          {copies.map((copy) =>
            sorted.map((g) => (
              <GiftGoalCard key={`${copy}-${g.id}`} gift={g} available={available} formatPts={formatPts} hidden={copy === 1} />
            )),
          )}
        </ul>
      </div>
    </div>
  )
}

function GiftGoalCard({
  gift,
  available,
  formatPts,
  hidden,
}: {
  gift: GoalGift
  available: number
  formatPts: (n: number) => string
  /** Second copy used only for the endless scroll; hidden from screen readers. */
  hidden: boolean
}) {
  const away = gift.points - available
  const ready = away <= 0
  const pct = ready ? 100 : Math.max(3, Math.round((available / gift.points) * 100))
  return (
    <li aria-hidden={hidden || undefined}>
      <Link
        href={`/contractor/rewards/catalogue/${encodeURIComponent(gift.id)}`}
        tabIndex={hidden ? -1 : undefined}
        className="flex w-[168px] items-center gap-2 rounded-lg border border-[#e2d8fa] bg-white p-2 shadow-xs transition-colors hover:border-brand/40"
        aria-label={ready ? `${gift.name}: ready to redeem` : `${gift.name}: ${formatPts(away)} more needed`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={gift.image} alt="" loading="lazy" className="size-10 shrink-0 rounded-md bg-white object-contain" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-ink" title={gift.name}>
            {gift.name}
          </p>
          {ready ? (
            <p className="flex items-center gap-1 text-[11px] font-semibold text-success">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              Ready to redeem
            </p>
          ) : (
            <p className="text-[11px] text-ink-muted">
              <strong className="text-brand-strong">{formatPts(away)}</strong> to go
            </p>
          )}
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#e6dcfa]">
            <div className={ready ? 'h-full rounded-full bg-success' : 'h-full rounded-full bg-gradient-to-r from-brand to-brand-strong'} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </Link>
    </li>
  )
}
