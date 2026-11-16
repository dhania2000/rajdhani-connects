'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Bell, ChevronRight, HelpCircle, LogOut, MessageCircle, Pencil, Phone } from 'lucide-react'
import { formatDate } from '@/lib/format'
import type { NotificationPreferences } from '@/lib/types'
import { useContractor } from '@/components/contractor/contractor-store'
import { VerifiedPartnerBadge } from '@/components/contractor/shared/verified-partner-badge'
import { ConfirmationDialog } from '@/components/contractor/shared/confirmation-dialog'
import { cn } from '@/lib/utils'

type Panel = 'none' | 'preferences' | 'help'

const prefLabels: Record<keyof NotificationPreferences, string> = {
  rewards: 'Reward updates',
  sales: 'Sale approvals',
  offers: 'Offers & schemes',
  sms: 'SMS alerts',
}

export function ProfileView() {
  const router = useRouter()
  const { profile, preferences, setPreference, updateProfile, resetDemo } = useContractor()
  const [panel, setPanel] = useState<Panel>('none')
  const [editing, setEditing] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [draft, setDraft] = useState({ mobile: profile.mobile, address: profile.address, area: profile.area })

  const details: [string, string][] = [
    ['Contractor ID', profile.id],
    ['Mobile Number', profile.mobile],
    ['Address', profile.address],
    ['Area', profile.area],
    ['Joining Date', formatDate(profile.joinedOn)],
    ['Account Status', profile.accountStatus],
  ]

  return (
    <main className="flex flex-col gap-4 p-4">
      <section className="flex flex-col items-center rounded-xl bg-white p-5 text-center shadow-[0_1px_4px_rgba(28,35,64,0.08)]">
        <div className="relative size-20 overflow-hidden rounded-full bg-[#dbe7f7] ring-4 ring-lavender">
          <Image src={profile.avatarUrl} alt={`${profile.name} profile photo`} fill sizes="80px" className="object-cover" />
        </div>
        <h2 className="mt-3 text-lg font-bold text-ink">{profile.name}</h2>
        <p className="text-xs text-ink-muted">{profile.id}</p>
        {profile.verified && (
          <div className="mt-2">
            <VerifiedPartnerBadge />
          </div>
        )}
      </section>

      <section className="rounded-xl bg-white shadow-[0_1px_4px_rgba(28,35,64,0.08)]" aria-label="Profile details">
        <dl className="divide-y divide-border">
          {details.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 px-4 py-3">
              <dt className="shrink-0 text-[13px] text-ink-muted">{k}</dt>
              <dd className={cn('text-right text-[13px] font-semibold text-ink', k === 'Account Status' && 'text-[#047857]')}>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-[0_1px_4px_rgba(28,35,64,0.08)]" aria-label="Settings">
        <MenuRow
          icon={Pencil}
          label="Edit Profile"
          onClick={() => {
            setDraft({ mobile: profile.mobile, address: profile.address, area: profile.area })
            setEditing(true)
          }}
        />
        <MenuRow icon={Bell} label="Notification Preferences" expanded={panel === 'preferences'} onClick={() => setPanel(panel === 'preferences' ? 'none' : 'preferences')} />
        {panel === 'preferences' && (
          <div className="flex flex-col gap-1 border-t border-border bg-app-bg px-4 py-2">
            {(Object.keys(prefLabels) as (keyof NotificationPreferences)[]).map((key) => (
              <label key={key} className="flex h-10 cursor-pointer items-center justify-between text-[13px] text-ink">
                {prefLabels[key]}
                <input
                  type="checkbox"
                  role="switch"
                  checked={preferences[key]}
                  onChange={(e) => setPreference(key, e.target.checked)}
                  className="relative h-5 w-9 cursor-pointer appearance-none rounded-full bg-[#cfd3e0] transition-colors before:absolute before:top-0.5 before:left-0.5 before:size-4 before:rounded-full before:bg-white before:transition-transform checked:bg-brand checked:before:translate-x-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                />
              </label>
            ))}
          </div>
        )}
        <MenuRow icon={HelpCircle} label="Help & Support" expanded={panel === 'help'} onClick={() => setPanel(panel === 'help' ? 'none' : 'help')} />
        {panel === 'help' && (
          <div className="grid grid-cols-2 gap-2.5 border-t border-border bg-app-bg p-4">
            <a href="tel:+911412345678" className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-white text-[13px] font-semibold text-ink shadow-xs">
              <Phone className="size-4 text-brand" aria-hidden="true" /> Call Store
            </a>
            <a
              href="https://wa.me/911412345678"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-white text-[13px] font-semibold text-ink shadow-xs"
            >
              <MessageCircle className="size-4 text-success" aria-hidden="true" /> WhatsApp
            </a>
          </div>
        )}
        <MenuRow icon={LogOut} label="Logout" danger onClick={() => setLoggingOut(true)} />
      </section>

      <ConfirmationDialog
        open={editing}
        title="Edit Profile"
        confirmLabel="Save"
        onCancel={() => setEditing(false)}
        onConfirm={() => {
          updateProfile({
            mobile: draft.mobile.trim() || profile.mobile,
            address: draft.address.trim() || profile.address,
            area: draft.area.trim() || profile.area,
          })
          setEditing(false)
        }}
      >
        <div className="mt-4 flex flex-col gap-3">
          {(['mobile', 'address', 'area'] as const).map((field) => (
            <label key={field} className="text-[12px] font-medium text-ink-muted capitalize">
              {field === 'mobile' ? 'Mobile number' : field}
              <input
                type={field === 'mobile' ? 'tel' : 'text'}
                value={draft[field]}
                maxLength={field === 'mobile' ? 16 : 120}
                onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-border px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand"
              />
            </label>
          ))}
        </div>
      </ConfirmationDialog>

      <ConfirmationDialog
        open={loggingOut}
        tone="danger"
        title="Log out?"
        description="This demo will reset your local data and return to the welcome screen."
        confirmLabel="Logout"
        onCancel={() => setLoggingOut(false)}
        onConfirm={() => {
          resetDemo()
          router.push('/logged-out')
        }}
      />
    </main>
  )
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  danger,
  expanded,
}: {
  icon: typeof Bell
  label: string
  onClick: () => void
  danger?: boolean
  expanded?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="flex h-13 w-full items-center gap-3 border-b border-border px-4 text-left last:border-b-0 hover:bg-app-bg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
    >
      <Icon className={cn('size-[18px]', danger ? 'text-danger' : 'text-brand')} aria-hidden="true" />
      <span className={cn('flex-1 text-sm font-medium', danger ? 'text-danger' : 'text-ink')}>{label}</span>
      {!danger && <ChevronRight className={cn('size-4 text-ink-muted transition-transform', expanded && 'rotate-90')} aria-hidden="true" />}
    </button>
  )
}
