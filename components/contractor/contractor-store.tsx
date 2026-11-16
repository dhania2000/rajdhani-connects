'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  contractorProfile,
  defaultNotificationPreferences,
  initialClaims,
  notifications as initialNotifications,
  rewardSummary,
} from '@/lib/mock-data'
import type {
  ClaimStatus,
  ContractorProfile,
  Gift,
  NotificationPreferences,
  RewardClaim,
} from '@/lib/types'

const STORAGE_KEY = 'rts-contractor-state-v1'
const CLAIM_FLOW: ClaimStatus[] = ['requested', 'approved', 'delivered']

interface PersistedState {
  profile: ContractorProfile
  availablePoints: number
  claims: RewardClaim[]
  preferences: NotificationPreferences
  readNotificationIds: string[]
}

interface ContractorStore extends PersistedState {
  unreadCount: number
  claimGift: (gift: Gift) => { ok: true; claim: RewardClaim } | { ok: false; reason: string }
  advanceClaim: (claimId: string) => void
  updateProfile: (patch: Partial<ContractorProfile>) => void
  setPreference: (key: keyof NotificationPreferences, value: boolean) => void
  markAllNotificationsRead: () => void
  resetDemo: () => void
}

const initialState: PersistedState = {
  profile: contractorProfile,
  availablePoints: rewardSummary.available,
  claims: initialClaims,
  preferences: defaultNotificationPreferences,
  readNotificationIds: [],
}

const ContractorContext = createContext<ContractorStore | null>(null)

export function ContractorProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setState({ ...initialState, ...JSON.parse(raw) })
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  const claimGift = useCallback<ContractorStore['claimGift']>(
    (gift) => {
      if (gift.availability === 'out-of-stock') return { ok: false, reason: 'This gift is currently out of stock.' }
      if (state.availablePoints < gift.points) return { ok: false, reason: 'Insufficient reward balance.' }
      if (state.claims.some((c) => c.giftId === gift.id && c.status === 'requested')) {
        return { ok: false, reason: 'You already have a pending request for this gift.' }
      }
      const claim: RewardClaim = {
        id: `CLM-${Math.floor(1000 + Math.random() * 9000)}`,
        giftId: gift.id,
        giftName: gift.name,
        points: gift.points,
        requestedOn: new Date().toISOString().slice(0, 10),
        status: 'requested',
      }
      setState((s) => ({ ...s, availablePoints: s.availablePoints - gift.points, claims: [claim, ...s.claims] }))
      return { ok: true, claim }
    },
    [state.availablePoints, state.claims],
  )

  const advanceClaim = useCallback((claimId: string) => {
    setState((s) => ({
      ...s,
      claims: s.claims.map((c) => {
        if (c.id !== claimId) return c
        const next = CLAIM_FLOW[Math.min(CLAIM_FLOW.indexOf(c.status) + 1, CLAIM_FLOW.length - 1)]
        return { ...c, status: next }
      }),
    }))
  }, [])

  const value = useMemo<ContractorStore>(
    () => ({
      ...state,
      unreadCount: initialNotifications.filter((n) => !state.readNotificationIds.includes(n.id)).length,
      claimGift,
      advanceClaim,
      updateProfile: (patch) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
      setPreference: (key, val) => setState((s) => ({ ...s, preferences: { ...s.preferences, [key]: val } })),
      markAllNotificationsRead: () =>
        setState((s) => ({ ...s, readNotificationIds: initialNotifications.map((n) => n.id) })),
      resetDemo: () => setState(initialState),
    }),
    [state, claimGift, advanceClaim],
  )

  return <ContractorContext.Provider value={value}>{children}</ContractorContext.Provider>
}

export function useContractor() {
  const ctx = useContext(ContractorContext)
  if (!ctx) throw new Error('useContractor must be used within ContractorProvider')
  return ctx
}
