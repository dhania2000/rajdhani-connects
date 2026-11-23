'use client'

import { useActionState } from 'react'
import { changePasswordAction, type FormState } from '@/app/contractor/actions'
import { AuthField, AuthError, AuthSubmit } from './auth-fields'

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changePasswordAction, {})

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <AuthField id="current" label="Current password" type="password" autoComplete="current-password" />
      <AuthField id="next" label="New password" type="password" autoComplete="new-password" />
      <AuthField id="confirm" label="Confirm new password" type="password" autoComplete="new-password" />
      <AuthError message={state.error} />
      <AuthSubmit pending={pending} label="Update password" pendingLabel="Updating..." />
    </form>
  )
}
