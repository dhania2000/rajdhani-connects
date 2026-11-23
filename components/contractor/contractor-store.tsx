'use client'

import { createContext, useCallback, useContext, useMemo } from 'react'
import useSWR from 'swr'
import { claimGiftAction, markNotificationsReadAction, setPreferenceAction } from '@/app/contractor/actions'
import type { ContractorAppState } from '@/lib/server/contractor-app'
import type { Gift, NotificationPreferences, RewardClaim } from '@/lib/types'

type ClaimOutcome = { ok: true; claim: RewardClaim } | { ok: false; reason: string }

interface ContractorStore extends ContractorAppState {
  claimGift: (gift: Gift, idempotencyKey: string) => Promise<ClaimOutcome>
  setPreference: (key: keyof NotificationPreferences, value: boolean) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
  refresh: () => Promise<unknown>
}

const STATE_KEY = '/api/contractor/state'

async function fetchState(url: string): Promise<ContractorAppState> {
  const res = await fetch(url, { cache: 'no-store' })
  if (res.status === 401) {
    window.location.href = '/contractor/login'
    throw new Error('Session expired')
  }
  if (!res.ok) throw new Error('Could not load your account')
  return res.json()
}

const ContractorContext = createContext<ContractorStore | null>(null)

export function ContractorProvider({ initialState, children }: { initialState: ContractorAppState; children: React.ReactNode }) {
  const { data, mutate } = useSWR(STATE_KEY, fetchState, {
    fallbackData: initialState,
    revalidateOnMount: false,
    revalidateOnFocus: true,
  })
  const state = data ?? initialState

  const claimGift = useCallback<ContractorStore['claimGift']>(
    async (gift, idempotencyKey) => {
      if (gift.availability === 'out-of-stock') return { ok: false, reason: 'This gift is currently out of stock.' }
      if (state.availablePoints < gift.points) return { ok: false, reason: 'Insufficient reward balance.' }
      const result = await claimGiftAction(gift.id, idempotencyKey)
      await mutate()
      return result
    },
    [state.availablePoints, mutate],
  )

  const setPreference = useCallback<ContractorStore['setPreference']>(
    async (key, value) => {
      await mutate(
        async (current) => {
          await setPreferenceAction(key, value)
          return current ? { ...current, preferences: { ...current.preferences, [key]: value } } : current
        },
        {
          optimisticData: (current) => ({ ...(current ?? state), preferences: { ...state.preferences, [key]: value } }),
          rollbackOnError: true,
          revalidate: false,
        },
      )
    },
    [mutate, state],
  )

  const markAllNotificationsRead = useCallback(async () => {
    await mutate(
      async (current) => {
        await markNotificationsReadAction()
        return current ? { ...current, unreadCount: 0 } : current
      },
      { optimisticData: (current) => ({ ...(current ?? state), unreadCount: 0 }), rollbackOnError: true, revalidate: false },
    )
  }, [mutate, state])

  const value = useMemo<ContractorStore>(
    () => ({ ...state, claimGift, setPreference, markAllNotificationsRead, refresh: () => mutate() }),
    [state, claimGift, setPreference, markAllNotificationsRead, mutate],
  )

  return <ContractorContext.Provider value={value}>{children}</ContractorContext.Provider>
}

export function useContractor() {
  const ctx = useContext(ContractorContext)
  if (!ctx) throw new Error('useContractor must be used within ContractorProvider')
  return ctx
}
