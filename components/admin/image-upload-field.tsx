'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ImagePlus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const MAX_BYTES = 4 * 1024 * 1024

export function ImageUploadField({
  label,
  name,
  fileName,
  defaultValue,
  className,
  aspect = 'square',
}: {
  label: string
  /** Field that keeps the saved image URL (cleared when the image is removed). */
  name: string
  /** Field that carries the newly chosen file. */
  fileName: string
  defaultValue?: string | null
  className?: string
  aspect?: 'square' | 'banner'
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [savedUrl, setSavedUrl] = useState(defaultValue ?? '')
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setError(null)
    if (!file) return setPreview(null)
    if (!file.type.startsWith('image/')) {
      e.target.value = ''
      return setError('Choose an image file (JPG, PNG, WebP, or GIF).')
    }
    if (file.size > MAX_BYTES) {
      e.target.value = ''
      return setError('Image must be 4 MB or smaller.')
    }
    setPreview(URL.createObjectURL(file))
  }

  function remove() {
    if (inputRef.current) inputRef.current.value = ''
    setPreview(null)
    setSavedUrl('')
    setError(null)
  }

  const shown = preview ?? (savedUrl || null)

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input type="hidden" name={name} value={savedUrl} />
      <div className="flex items-center gap-4 rounded-lg border border-dashed border-border bg-muted/40 p-3">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white',
            aspect === 'banner' ? 'h-16 w-28' : 'size-16',
          )}
        >
          {shown ? (
            <img src={shown} alt={`${label} preview`} className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-6 text-ink-muted" aria-hidden="true" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <Upload aria-hidden="true" />
              {shown ? 'Change image' : 'Upload image'}
            </Button>
            {shown ? (
              <Button type="button" variant="ghost" size="sm" onClick={remove} className="text-destructive hover:text-destructive">
                <Trash2 aria-hidden="true" />
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-ink-muted">JPG, PNG, WebP or GIF, up to 4 MB.</p>
        </div>
        <input
          ref={inputRef}
          id={id}
          name={fileName}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={onChange}
          className="sr-only"
        />
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
