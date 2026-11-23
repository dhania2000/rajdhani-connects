'use client'

import { useActionState } from 'react'
import { contractorLoginAction, type FormState } from '@/app/contractor/actions'
import { AuthField, AuthError, AuthSubmit } from './auth-fields'

export function LoginForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(contractorLoginAction, {})

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <AuthField id="identifier" label="Username or mobile number" autoComplete="username" inputMode="text" />
      <AuthField id="password" label="Password" type="password" autoComplete="current-password" />
      <AuthError message={state.error} />
      <AuthSubmit pending={pending} label="Log in" pendingLabel="Logging in..." />
    </form>
  )
}
