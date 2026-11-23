import type { AdminActionState } from '@/app/admin/(panel)/panel-actions'

type Action = (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>

/** Next.js control-flow errors (redirect, notFound) must keep propagating so navigation still works. */
function isNavigationError(error: unknown) {
  const digest = typeof error === 'object' && error !== null ? (error as { digest?: unknown }).digest : undefined
  return typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest.startsWith('NEXT_HTTP_ERROR_FALLBACK') || digest === 'NEXT_NOT_FOUND')
}

/**
 * Wraps a server action used with useActionState so a failure shows as a form error instead of
 * replacing the whole admin page with the "This page couldn't load" screen. Covers server
 * exceptions and pages left open across a deployment (their action IDs no longer exist).
 */
export function withSafeAction(action: Action): Action {
  return async (prev, formData) => {
    try {
      return await action(prev, formData)
    } catch (error) {
      if (isNavigationError(error)) throw error
      console.error('Admin action failed', error)
      const message = error instanceof Error ? error.message : ''
      if (/Server Action|older or newer deployment/i.test(message)) {
        return { error: 'This page is out of date after an update. Reload the page and try again.' }
      }
      return { error: 'Something went wrong while saving. Reload the page and try again.' }
    }
  }
}
