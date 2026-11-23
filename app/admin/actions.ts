'use server'

import { redirect } from 'next/navigation'
import { destroySession, loginAdmin } from '@/lib/server/auth'
import { isDbConfigured } from '@/lib/server/db'

export interface AdminFormState {
  error?: string
}

export async function adminLoginAction(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  if (!isDbConfigured()) return { error: 'The database is not configured yet. Set DATABASE_URL to enable admin login.' }
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  if (!email.trim() || !password) return { error: 'Enter your email or username and password.' }
  const result = await loginAdmin(email, password)
  if (!result.ok) return { error: result.error }
  redirect('/admin/dashboard')
}

export async function adminLogoutAction() {
  await destroySession('admin')
  redirect('/admin/login')
}
