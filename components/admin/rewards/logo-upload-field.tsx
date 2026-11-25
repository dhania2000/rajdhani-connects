'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { RotateCcw, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/contractor/layout/brand-logo'

const MAX_SIDE = 1024
const MAX_BYTES = 4 * 1024 * 1024

/** Redraws any image (JPG, PNG, WebP, GIF) as a PNG of at most 1024 px, so it also works for the favicon and phone icons. */
async function toPng(file: File): Promise<File> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('bad image'))
      i.src = url
    })
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
    if (!blob) throw new Error('convert failed')
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** App logo picker for App Content Control. Saving replaces the logo in both panels, the favicon and phone icons. */
export function LogoUploadField({ defaultValue }: { defaultValue: string }) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [savedUrl, setSavedUrl] = useState(defaultValue)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => setSavedUrl(defaultValue), [defaultValue])
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const file = input.files?.[0]
    setError(null)
    if (!file) return setPreview(null)
    if (!file.type.startsWith('image/') || file.size > MAX_BYTES) {
      input.value = ''
      return setError('Choose a JPG, PNG, WebP or GIF image up to 4 MB.')
    }
    setBusy(true)
    try {
      const png = await toPng(file)
      const dt = new DataTransfer()
      dt.items.add(png)
      input.files = dt.files
      setPreview(URL.createObjectURL(png))
    } catch {
      input.value = ''
      setError('This image could not be read. Try another file.')
    } finally {
      setBusy(false)
    }
  }

  function useDefault() {
    if (inputRef.current) inputRef.current.value = ''
    setPreview(null)
    setSavedUrl('')
    setError(null)
  }

  const shown = preview ?? savedUrl
  const isDefault = !shown

  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        App logo
      </label>
      <input type="hidden" name="logoUrl" value={savedUrl} />
      <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border bg-muted/40 p-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          {/* How it looks on the navy headers and as the phone icon. */}
          <span className="flex size-16 items-center justify-center rounded-xl bg-navy">
            <BrandLogo className="size-11" src={shown} />
          </span>
          <BrandLogo className="size-16 ring-1 ring-border" src={shown} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
              <Upload aria-hidden="true" />
              {busy ? 'Preparing…' : 'Upload new logo'}
            </Button>
            {!isDefault ? (
              <Button type="button" variant="ghost" size="sm" onClick={useDefault}>
                <RotateCcw aria-hidden="true" />
                Use default logo
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-ink-muted">
            {preview ? 'New logo selected. Click Save changes to apply it everywhere.' : isDefault ? 'Showing the default Rajdhani logo.' : 'Showing your uploaded logo.'}{' '}
            Used in the contractor app, admin panel, browser tab icon and phone home-screen icon. A square logo on a white or clear background looks best.
          </p>
        </div>
        <input ref={inputRef} id={id} name="logoFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onChange} className="sr-only" />
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
