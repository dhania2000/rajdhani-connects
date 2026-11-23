'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { updateProfilePhotoAction } from '@/app/contractor/actions'
import { useContractor } from '@/components/contractor/contractor-store'
import { ContractorAvatar } from '@/components/contractor/shared/contractor-avatar'

const MAX_DIMENSION = 1024
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

// Phone camera photos are often larger than the 4 MB server limit, so shrink them before upload.
async function prepareImage(file: File): Promise<Blob> {
  if (file.type === 'image/gif') return file
  const url = URL.createObjectURL(file)
  try {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    await img.decode()
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob ?? file
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function ProfilePhotoUploader() {
  const { profile, refresh } = useContractor()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(fd: FormData) {
    setBusy(true)
    setError(null)
    try {
      const result = await updateProfilePhotoAction(fd)
      if (!result.ok) setError(result.error ?? 'Could not update photo.')
      else await refresh()
    } catch {
      setError('Upload failed. Please check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    const blob = await prepareImage(file)
    if (blob.size > MAX_UPLOAD_BYTES) {
      setError('Image must be 4 MB or smaller.')
      return
    }
    const fd = new FormData()
    fd.append('photo', blob, blob === file ? file.name : 'profile.jpg')
    await submit(fd)
  }

  async function removePhoto() {
    const fd = new FormData()
    fd.append('remove', '1')
    await submit(fd)
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <ContractorAvatar
          src={profile.avatarUrl}
          name={profile.name}
          sizes="80px"
          className="size-20 ring-4 ring-lavender"
          textClassName="text-2xl"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label={profile.avatarUrl ? 'Change profile photo' : 'Upload profile photo'}
          className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full bg-brand text-white shadow-md ring-2 ring-white disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Camera className="size-4" aria-hidden="true" />}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={onFileChange}
      />
      <div className="mt-2 flex items-center gap-3 text-xs">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="font-semibold text-brand disabled:opacity-60">
          {busy ? 'Uploading...' : profile.avatarUrl ? 'Change photo' : 'Upload photo'}
        </button>
        {profile.avatarUrl && !busy && (
          <button type="button" onClick={removePhoto} className="flex items-center gap-1 font-medium text-danger">
            <Trash2 className="size-3" aria-hidden="true" /> Remove
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
