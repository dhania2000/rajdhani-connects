'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  changeContractorPassword,
  destroySession,
  loginContractor,
  requireContractor,
} from '@/lib/server/auth'
import { isDbConfigured } from '@/lib/server/db'
import { passwordPolicyError } from '@/lib/server/passwords'
import {
  claimGift,
  markNotificationsRead,
  setNotificationPreference,
  type ClaimResult,
} from '@/lib/server/contractor-app'
import { setContractorPhoto } from '@/lib/server/contractors'
import { isUploadedFile, saveImageUpload } from '@/lib/server/media'
import type { NotificationPreferences } from '@/lib/types'

export interface FormState {
  error?: string
}

export async function contractorLoginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isDbConfigured()) return { error: 'The rewards server is not configured yet. Please contact the store.' }
  const identifier = String(formData.get('identifier') ?? '')
  const password = String(formData.get('password') ?? '')
  if (!identifier.trim() || !password) return { error: 'Enter your username or mobile number and password.' }
  const result = await loginContractor(identifier, password)
  if (!result.ok) return { error: result.error }
  redirect(result.mustChangePassword ? '/contractor/change-password' : '/contractor')
}

export async function contractorLogoutAction() {
  await destroySession('contractor')
  redirect('/logged-out')
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireContractor({ allowPasswordChange: true })
  const current = String(formData.get('current') ?? '')
  const next = String(formData.get('next') ?? '')
  const confirm = String(formData.get('confirm') ?? '')
  if (next !== confirm) return { error: 'New passwords do not match.' }
  const policy = passwordPolicyError(next)
  if (policy) return { error: policy }
  const result = await changeContractorPassword(session, current, next)
  if (!result.ok) return { error: result.error }
  redirect('/contractor')
}

const claimSchema = z.object({ giftId: z.string().min(1).max(40), idempotencyKey: z.string().uuid() })

export async function claimGiftAction(giftId: string, idempotencyKey: string): Promise<ClaimResult> {
  const session = await requireContractor()
  const parsed = claimSchema.safeParse({ giftId, idempotencyKey })
  if (!parsed.success) return { ok: false, reason: 'Invalid request.' }
  const result = await claimGift(session.contractorId, parsed.data.giftId, parsed.data.idempotencyKey)
  if (result.ok) revalidatePath('/contractor', 'layout')
  return result
}

const preferenceKeys = ['rewards', 'sales', 'offers', 'sms'] as const

export async function setPreferenceAction(key: keyof NotificationPreferences, value: boolean) {
  const session = await requireContractor()
  if (!preferenceKeys.includes(key) || typeof value !== 'boolean') return { ok: false }
  await setNotificationPreference(session.contractorId, key, value)
  return { ok: true }
}

export async function updateProfilePhotoAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await requireContractor()
  const actor = { type: 'contractor' as const, id: session.contractorId }
  if (formData.get('remove') === '1') {
    const removed = await setContractorPhoto(actor, session.contractorId, null)
    if (!removed.ok) return { ok: false, error: removed.error }
    revalidatePath('/contractor', 'layout')
    return { ok: true }
  }
  const file = formData.get('photo')
  if (!isUploadedFile(file)) return { ok: false, error: 'Choose a photo to upload.' }
  const upload = await saveImageUpload(file, null)
  if (!upload.ok) return { ok: false, error: upload.error }
  const result = await setContractorPhoto(actor, session.contractorId, upload.url)
  if (!result.ok) return { ok: false, error: result.error }
  revalidatePath('/contractor', 'layout')
  return { ok: true }
}

export async function markNotificationsReadAction() {
  const session = await requireContractor()
  await markNotificationsRead(session.contractorId)
  return { ok: true }
}
