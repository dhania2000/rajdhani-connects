'use server'

import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import { requireAdmin } from '@/lib/server/auth'
import { isUploadedFile, saveImageUpload } from '@/lib/server/media'
import {
  adjustContractorPoints,
  adjustmentSchema,
  changeContractorStatus,
  contractorDetailsSchema,
  createContractor,
  createContractorSchema,
  resetContractorPassword,
  unlockContractor,
  updateContractorDetails,
  type IssuedCredentials,
  type StatusAction,
} from '@/lib/server/contractors'
import {
  activitySchema,
  approveActivity,
  createActivity,
  createRule,
  rejectActivity,
  reverseActivity,
  ruleSchema,
  setRuleStatus,
  updateRule,
} from '@/lib/server/rewards-engine'
import {
  appContentSchema,
  archiveGift,
  assignGift,
  broadcastSchema,
  giftSchema,
  offerSchema,
  QUICK_ACTION_KEYS,
  saveAppContent,
  saveGift,
  saveOffer,
  sendBroadcast,
  transitionRedemption,
  type RedemptionStatus,
} from '@/lib/server/admin-rewards'

export interface AdminActionState {
  ok?: boolean
  error?: string
  message?: string
  credentials?: IssuedCredentials
}

type Result = { ok: true } | { ok: false; error: string }

function entries(fd: FormData) {
  const obj: Record<string, string> = {}
  for (const [k, v] of fd.entries()) if (typeof v === 'string') obj[k] = v
  return obj
}

function parse<T extends z.ZodTypeAny>(schema: T, data: unknown): { data: z.infer<T> } | { error: string } {
  const r = schema.safeParse(data)
  return r.success ? { data: r.data } : { error: r.error.issues[0]?.message ?? 'Please check the form.' }
}

async function uploadImage(fd: FormData, key: string, adminId: number) {
  const file = fd.get(key)
  if (!isUploadedFile(file)) return null
  const r = await saveImageUpload(file, adminId)
  return r.ok ? { url: r.url } : { error: r.error }
}

function idOf(fd: FormData, key = 'id') {
  const n = Number(fd.get(key))
  return Number.isInteger(n) && n > 0 ? n : null
}

function done(result: Result | { ok: boolean; error?: string }, message: string): AdminActionState {
  revalidatePath('/admin', 'layout')
  return result.ok ? { ok: true, message } : { error: (result as { error?: string }).error ?? 'Something went wrong.' }
}

// Contractors ----------------------------------------------------------------

export async function createContractorAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const parsed = parse(createContractorSchema, { ...entries(fd), activateNow: fd.get('activateNow') === 'on' })
  if ('error' in parsed) return { error: parsed.error }
  const result = await createContractor(admin, parsed.data)
  if (!result.ok) return { error: result.error }
  revalidatePath('/admin', 'layout')
  return { ok: true, message: 'Contractor created.', credentials: result.credentials }
}

export async function updateContractorAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const id = idOf(fd)
  if (!id) return { error: 'Contractor not found.' }
  const parsed = parse(contractorDetailsSchema, entries(fd))
  if ('error' in parsed) return { error: parsed.error }
  return done(await updateContractorDetails(admin, id, parsed.data), 'Details saved.')
}

const STATUS_ACTIONS: StatusAction[] = ['approve', 'verify', 'reject', 'suspend', 'reactivate', 'deactivate']

export async function contractorStatusAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const id = idOf(fd)
  const action = String(fd.get('action')) as StatusAction
  if (!id || !STATUS_ACTIONS.includes(action)) return { error: 'Invalid request.' }
  const note = String(fd.get('note') ?? '').trim() || null
  return done(await changeContractorStatus(admin, id, action, note), 'Status updated.')
}

export async function resetPasswordAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const id = idOf(fd)
  if (!id) return { error: 'Contractor not found.' }
  const result = await resetContractorPassword(admin, id)
  if (!result.ok) return { error: result.error }
  revalidatePath('/admin', 'layout')
  return { ok: true, message: 'Password reset. All sessions were signed out.', credentials: result.credentials }
}

export async function unlockContractorAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const id = idOf(fd)
  if (!id) return { error: 'Contractor not found.' }
  return done(await unlockContractor(admin, id), 'Account unlocked.')
}

export async function adjustPointsAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const id = idOf(fd)
  if (!id) return { error: 'Contractor not found.' }
  const parsed = parse(adjustmentSchema, entries(fd))
  if ('error' in parsed) return { error: parsed.error }
  return done(await adjustContractorPoints(admin, id, parsed.data), 'Balance adjusted.')
}

export async function assignGiftAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const id = idOf(fd)
  const giftId = idOf(fd, 'giftId')
  if (!id || !giftId) return { error: 'Select a gift.' }
  const note = String(fd.get('note') ?? '').trim()
  return done(await assignGift(admin, id, giftId, note || 'Assigned by admin'), 'Gift assigned.')
}

// Rules ------------------------------------------------------------------------

export async function saveRuleAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const parsed = parse(ruleSchema, entries(fd))
  if ('error' in parsed) return { error: parsed.error }
  const id = idOf(fd)
  const result = id ? await updateRule(admin, id, parsed.data) : await createRule(admin, parsed.data)
  return done(result, id ? 'Rule updated (new version created).' : 'Rule created.')
}

export async function ruleStatusAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const id = idOf(fd)
  const status = String(fd.get('status'))
  if (!id || !['active', 'inactive', 'archived'].includes(status)) return { error: 'Invalid request.' }
  return done(await setRuleStatus(admin, id, status as 'active' | 'inactive' | 'archived'), `Rule ${status}.`)
}

// Activities -------------------------------------------------------------------

export async function createActivityAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const parsed = parse(activitySchema, entries(fd))
  if ('error' in parsed) return { error: parsed.error }
  const approveNow = fd.get('approveNow') === 'on'
  return done(await createActivity(admin, parsed.data, approveNow), approveNow ? 'Sale recorded and rewards credited.' : 'Sale recorded for review.')
}

export async function activityDecisionAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const id = idOf(fd)
  const decision = String(fd.get('decision'))
  const reason = String(fd.get('reason') ?? '').trim()
  if (!id) return { error: 'Activity not found.' }
  if (decision === 'approve') return done(await approveActivity(admin, id), 'Approved and rewards credited.')
  if (reason.length < 3) return { error: 'Enter a reason.' }
  if (decision === 'reject') return done(await rejectActivity(admin, id, reason), 'Activity rejected.')
  if (decision === 'reverse') return done(await reverseActivity(admin, id, reason), 'Activity reversed.')
  return { error: 'Invalid request.' }
}

// Gifts & claims -------------------------------------------------------------

export async function saveGiftAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const parsed = parse(giftSchema, entries(fd))
  if ('error' in parsed) return { error: parsed.error }
  const upload = await uploadImage(fd, 'imageFile', admin.adminId)
  if (upload && 'error' in upload) return { error: upload.error }
  if (upload) parsed.data.imageUrl = upload.url
  const id = idOf(fd)
  return done(await saveGift(admin, id, parsed.data), id ? 'Gift updated.' : 'Gift added.')
}

export async function archiveGiftAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const id = idOf(fd)
  if (!id) return { error: 'Gift not found.' }
  return done(await archiveGift(admin, id), 'Gift archived.')
}

const REDEMPTION_STATUSES: RedemptionStatus[] = ['under_review', 'approved', 'rejected', 'ready_for_handover', 'delivered', 'completed', 'cancelled']

export async function redemptionAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const id = idOf(fd)
  const to = String(fd.get('to')) as RedemptionStatus
  if (!id || !REDEMPTION_STATUSES.includes(to)) return { error: 'Choose the next status.' }
  const note = String(fd.get('note') ?? '').trim() || null
  const ref = String(fd.get('handoverReference') ?? '').trim() || null
  if (to === 'rejected' && !note) return { error: 'Add a rejection reason for the contractor.' }
  return done(await transitionRedemption(admin, id, to, note, ref), 'Claim updated.')
}

// Offers, notifications, content -----------------------------------------------

export async function saveOfferAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const parsed = parse(offerSchema, entries(fd))
  if ('error' in parsed) return { error: parsed.error }
  const upload = await uploadImage(fd, 'bannerFile', admin.adminId)
  if (upload && 'error' in upload) return { error: upload.error }
  if (upload) parsed.data.bannerUrl = upload.url
  const id = idOf(fd)
  return done(await saveOffer(admin, id, parsed.data), id ? 'Offer updated.' : 'Offer created.')
}

export async function broadcastAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const parsed = parse(broadcastSchema, entries(fd))
  if ('error' in parsed) return { error: parsed.error }
  const result = await sendBroadcast(admin, parsed.data)
  revalidatePath('/admin', 'layout')
  return { ok: true, message: `Notification sent to ${result.recipients} contractor(s).` }
}

export async function saveAppContentAction(_: AdminActionState, fd: FormData): Promise<AdminActionState> {
  const admin = await requireAdmin()
  const raw = entries(fd)
  const parsed = parse(appContentSchema, {
    ...raw,
    quickActions: QUICK_ACTION_KEYS.map((key) => ({
      key,
      title: raw[`qa_${key}_title`] ?? '',
      subtitle: raw[`qa_${key}_subtitle`] ?? '',
      visible: raw[`qa_${key}_visible`] === 'on',
    })),
  })
  if ('error' in parsed) return { error: parsed.error }
  return done(await saveAppContent(admin, parsed.data), 'Contractor app content saved.')
}
