'use client'

import { useEffect } from 'react'

/**
 * iOS 26.1+ bug (WebKit 301994): an iPhone home-screen web app is drawn under the status bar,
 * but env(safe-area-inset-top) reports 0, so headers end up under the clock / Dynamic Island.
 *
 * When that happens this sets --sa-top-fallback on <html> to the real status-bar height of the
 * iPhone model (by screen size, in CSS points); CSS uses max(env(safe-area-inset-top), var(--sa-top-fallback)).
 * Everywhere else (Android, desktop, Safari tabs, iPhones where env() works) the variable stays unset.
 */
const STATUS_BAR_BY_SCREEN_HEIGHT: Record<number, number> = {
  // Dynamic Island
  852: 59, // iPhone 14 Pro, 15, 15 Pro, 16
  932: 59, // iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  874: 62, // iPhone 16 Pro, 17, 17 Pro
  956: 62, // iPhone 16 Pro Max, 17 Pro Max
  912: 62, // iPhone Air
  // Notch
  812: 50, // iPhone X, XS, 11 Pro, 12 mini, 13 mini
  844: 47, // iPhone 12, 13, 14, 16e
  896: 48, // iPhone XR, 11, XS Max, 11 Pro Max
  926: 47, // iPhone 12/13 Pro Max, 14 Plus
}

function isIosStandalone() {
  const ua = navigator.userAgent
  const ios = /iphone|ipod/i.test(ua)
  return ios && ((navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches)
}

function envTopInset() {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;padding-top:env(safe-area-inset-top)'
  document.body.appendChild(probe)
  const px = parseFloat(getComputedStyle(probe).paddingTop) || 0
  probe.remove()
  return px
}

export function useIosStatusBarFix() {
  useEffect(() => {
    if (!isIosStandalone()) return
    const apply = () => {
      const root = document.documentElement
      root.style.removeProperty('--sa-top-fallback')
      const portrait = window.innerHeight > window.innerWidth
      // Drawn under the status bar = the page is as tall as the whole screen.
      const underStatusBar = window.innerHeight >= Math.max(screen.height, screen.width) - 1
      if (!portrait || !underStatusBar || envTopInset() > 0) return
      const h = STATUS_BAR_BY_SCREEN_HEIGHT[Math.max(screen.height, screen.width)] ?? 47
      root.style.setProperty('--sa-top-fallback', `${h}px`)
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [])
}
