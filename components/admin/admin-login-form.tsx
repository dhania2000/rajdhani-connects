'use client'

import { useActionState } from 'react'
import { adminLoginAction, type AdminFormState } from '@/app/admin/actions'
import { AuthError, AuthField, AuthSubmit } from '@/components/contractor/auth/auth-fields'

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState<AdminFormState, FormData>(adminLoginAction, {})

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <AuthField id="email" label="Email or username" autoComplete="username" inputMode="email" />
      <AuthField id="password" label="Password" type="password" autoComplete="current-password" />
      <AuthError message={state.error} />
      <AuthSubmit pending={pending} label="Log in to Admin" pendingLabel="Logging in..." />
    </form>
  )
}
