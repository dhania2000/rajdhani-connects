import type { Metadata } from 'next'
import { requireContractor } from '@/lib/server/auth'
import { AuthShell } from '@/components/contractor/auth/auth-shell'
import { ChangePasswordForm } from '@/components/contractor/auth/change-password-form'

export const metadata: Metadata = { title: 'Change Password – Rajdhani Connects' }
export const dynamic = 'force-dynamic'

export default async function ChangePasswordPage() {
  await requireContractor({ allowPasswordChange: true })

  return (
    <AuthShell title="Set a New Password" description="For your security, please choose a new password to continue.">
      <ChangePasswordForm />
    </AuthShell>
  )
}
