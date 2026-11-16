'use client'

import { AlertTriangle } from 'lucide-react'

export default function ContractorError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <h1 className="text-lg font-bold text-ink">Something went wrong</h1>
      <p className="text-sm text-ink-muted">We couldn&apos;t load this screen. Please try again.</p>
      <button type="button" onClick={reset} className="mt-2 h-10 rounded-lg bg-brand-strong px-5 text-sm font-semibold text-white">
        Try again
      </button>
    </main>
  )
}
