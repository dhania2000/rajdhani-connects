import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getContractorSession } from '@/lib/server/auth'
import { AuthShell } from '@/components/contractor/auth/auth-shell'
import { LoginForm } from '@/components/contractor/auth/login-form'

export const metadata: Metadata = { title: 'Login – Rajdhani Connects' }
export const dynamic = 'force-dynamic'

export default async function ContractorLoginPage() {
  const session = await getContractorSession()
  if (session) redirect(session.mustChangePassword ? '/contractor/change-password' : '/contractor')

  return (
    <AuthShell title="Contractor Login" description="Log in with your username or registered mobile number.">
      <LoginForm />
    </AuthShell>
  )
}
