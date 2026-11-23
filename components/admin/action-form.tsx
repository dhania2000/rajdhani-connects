'use client'

import { useActionState, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AdminActionState } from '@/app/admin/(panel)/panel-actions'

type Action = (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>

export function ActionForm({
  action,
  children,
  className,
  submitLabel,
  submitVariant = 'default',
  inline = false,
}: {
  action: Action
  children?: ReactNode
  className?: string
  submitLabel?: string
  submitVariant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost'
  inline?: boolean
}) {
  const [state, formAction] = useActionState<AdminActionState, FormData>(action, {})

  return (
    <form action={formAction} className={cn(inline ? 'flex flex-wrap items-end gap-2' : 'flex flex-col gap-4', className)}>
      {children}
      {submitLabel ? <SubmitButton label={submitLabel} variant={submitVariant} /> : null}
      {state.error ? (
        <p role="alert" className="w-full text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="w-full text-sm text-emerald-700">
          {state.message}
        </p>
      ) : null}
      {state.credentials ? (
        <div className="w-full rounded-lg border border-brand/20 bg-brand/5 p-3 text-sm text-ink">
          <p className="font-semibold">Share these login details with {state.credentials.name}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-ink-muted">Code</dt>
            <dd className="font-mono">{state.credentials.contractorCode}</dd>
            <dt className="text-ink-muted">Username</dt>
            <dd className="font-mono">{state.credentials.username}</dd>
            <dt className="text-ink-muted">Temporary password</dt>
            <dd className="font-mono">{state.credentials.temporaryPassword}</dd>
          </dl>
          <p className="mt-2 text-xs text-ink-muted">The contractor must change this password on first login.</p>
        </div>
      ) : null}
    </form>
  )
}

export function SubmitButton({
  label,
  variant = 'default',
}: {
  label: string
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost'
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant={variant} disabled={pending} className="h-10 self-start px-4">
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {pending ? 'Saving...' : label}
    </Button>
  )
}
