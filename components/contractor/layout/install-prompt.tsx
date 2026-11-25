'use client'

import { useCallback, useEffect, useState } from 'react'
import { PlusSquare, Share, X } from 'lucide-react'
import { useContractor } from '@/components/contractor/contractor-store'
import { BrandLogo } from './brand-logo'

/** Chrome/Edge/Samsung Internet event that lets the page trigger "Add to Home screen". */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Fire this event (e.g. from the Profile screen) to show the popup again after "Not now". */
export const SHOW_INSTALL_EVENT = 'rc:show-install'

const DISMISS_KEY = 'rc_install_dismissed_until'
const SNOOZE_DAYS = 7

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIos() {
  const ua = navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

function snoozed() {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now()
  } catch {
    return false
  }
}

/**
 * "Add shortcut" popup: on Android it adds the app to the home screen in one tap; on iPhone,
 * where browsers can't do that for a site, it shows the Share > Add to Home Screen steps.
 */
export function InstallPrompt() {
  const { content } = useContractor()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [mode, setMode] = useState<'hidden' | 'prompt' | 'ios'>('hidden')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
    if (isStandalone()) return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      if (!snoozed()) setMode('prompt')
    }
    const onInstalled = () => {
      setDeferred(null)
      setMode('hidden')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    let timer: ReturnType<typeof setTimeout> | undefined
    if (isIos() && !snoozed()) timer = setTimeout(() => setMode('ios'), 1500)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      if (timer) clearTimeout(timer)
    }
  }, [])

  // Lets other screens reopen the popup on request, ignoring the snooze.
  useEffect(() => {
    const reopen = () => {
      if (isStandalone()) return
      if (deferred) setMode('prompt')
      else if (isIos()) setMode('ios')
    }
    window.addEventListener(SHOW_INSTALL_EVENT, reopen)
    return () => window.removeEventListener(SHOW_INSTALL_EVENT, reopen)
  }, [deferred])

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + SNOOZE_DAYS * 86_400_000))
    } catch {}
    setMode('hidden')
  }, [])

  async function addShortcut() {
    if (!deferred) return
    setBusy(true)
    try {
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      setDeferred(null)
      if (outcome === 'accepted') setMode('hidden')
      else dismiss()
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'hidden') return null

  return (
    <div
      role="dialog"
      aria-labelledby="install-title"
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto w-[calc(100%-1.5rem)] max-w-[396px] rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgba(23,28,73,0.25)] ring-1 ring-black/5"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close"
        className="absolute top-2.5 right-2.5 flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-app-bg"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
      <div className="flex items-center gap-3 pr-6">
        <BrandLogo className="size-12 ring-1 ring-border" src={content.logoUrl} />
        <div className="min-w-0">
          <p id="install-title" className="text-[15px] font-bold text-ink">
            Add {content.brandName} to your phone
          </p>
          <p className="text-[12px] leading-snug text-ink-muted">Open your rewards in one tap from the home screen, like an app.</p>
        </div>
      </div>

      {mode === 'prompt' ? (
        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <button type="button" onClick={dismiss} className="h-10 rounded-lg border border-border text-sm font-semibold text-ink">
            Not now
          </button>
          <button
            type="button"
            onClick={addShortcut}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand-strong text-sm font-semibold text-white disabled:opacity-70"
          >
            <PlusSquare className="size-4" aria-hidden="true" />
            Add shortcut
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-lg bg-app-bg p-3 text-[12px] leading-relaxed text-ink">
          <p className="flex flex-wrap items-center gap-1">
            1. Tap the <Share className="inline size-4 text-info" aria-label="Share" /> Share button in Safari.
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1">
            2. Choose <span className="inline-flex items-center gap-1 font-semibold"><PlusSquare className="size-4" aria-hidden="true" />Add to Home Screen</span>.
          </p>
          <button type="button" onClick={dismiss} className="mt-2.5 h-9 w-full rounded-lg bg-white text-sm font-semibold text-ink shadow-xs">
            Got it
          </button>
        </div>
      )}
    </div>
  )
}
