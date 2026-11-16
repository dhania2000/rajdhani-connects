'use client'

import { useEffect, useId, useRef } from 'react'

interface ConfirmationDialogProps {
  open: boolean
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  tone?: 'brand' | 'danger'
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  tone = 'brand',
  onConfirm,
  onCancel,
  children,
}: ConfirmationDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onCancel()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-[360px] rounded-2xl bg-white p-0 text-ink shadow-xl backdrop:bg-navy/60"
    >
      <div className="p-5">
        <h2 id={titleId} className="text-[17px] font-bold">
          {title}
        </h2>
        {description && <div className="mt-1.5 text-sm leading-relaxed text-ink-muted">{description}</div>}
        {children}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-11 rounded-lg border border-border text-sm font-semibold text-ink transition-colors hover:bg-muted disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy}
            className={
              'h-11 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60 ' +
              (tone === 'danger' ? 'bg-danger hover:bg-danger/90' : 'bg-brand-strong hover:bg-brand')
            }
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
