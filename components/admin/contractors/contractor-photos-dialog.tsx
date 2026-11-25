'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ImagePlus, Loader2, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  deleteContractorPhotoAction,
  finishContractorPhotoUploadAction,
  listContractorPhotosAction,
  uploadContractorPhotoAction,
} from '@/app/admin/(panel)/panel-actions'
import type { ContractorPhoto } from '@/lib/server/contractor-photos'
import { localIsoDate, stampLabel, stampPhoto } from './photo-stamp'

const MAX_FILES = 20

interface Picked {
  key: string
  file: File
  preview: string
}

const fmtDate = (iso: string) => stampLabel(new Date(`${iso}T00:00:00`))

/** Admin uploads photos to one contractor's Gallery. Each photo gets today's date printed on it. */
export function ContractorPhotosDialog({
  contractor,
  open,
  onOpenChange,
}: {
  contractor: { id: number; name: string }
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<ContractorPhoto[] | null>(null)
  const [picked, setPicked] = useState<Picked[]>([])
  const [caption, setCaption] = useState('')
  const [preparing, setPreparing] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [today] = useState(() => new Date())

  useEffect(() => {
    if (!open) return
    setPhotos(null)
    listContractorPhotosAction(contractor.id)
      .then(setPhotos)
      .catch(() => setPhotos([]))
  }, [open, contractor.id])

  // Free preview URLs when the dialog closes.
  useEffect(() => {
    if (open) return
    setPicked((list) => {
      list.forEach((p) => URL.revokeObjectURL(p.preview))
      return []
    })
    setCaption('')
    setProgress(null)
  }, [open])

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])].filter((f) => f.type.startsWith('image/'))
    e.target.value = ''
    if (files.length === 0) return
    const room = MAX_FILES - picked.length
    if (files.length > room) toast.error(`You can upload up to ${MAX_FILES} photos at a time.`)
    setPreparing(true)
    const next: Picked[] = []
    for (const f of files.slice(0, Math.max(room, 0))) {
      try {
        const stamped = await stampPhoto(f, new Date())
        next.push({ key: `${f.name}-${f.size}-${Math.random()}`, file: stamped, preview: URL.createObjectURL(stamped) })
      } catch {
        toast.error(`${f.name} could not be read.`)
      }
    }
    setPicked((list) => [...list, ...next])
    setPreparing(false)
  }

  function unpick(key: string) {
    setPicked((list) => {
      const p = list.find((x) => x.key === key)
      if (p) URL.revokeObjectURL(p.preview)
      return list.filter((x) => x.key !== key)
    })
  }

  async function upload() {
    const date = localIsoDate(new Date())
    const added: ContractorPhoto[] = []
    setProgress({ done: 0, total: picked.length })
    // One photo per request: server actions accept at most 5 MB per request.
    for (const [i, p] of picked.entries()) {
      const fd = new FormData()
      fd.set('contractorId', String(contractor.id))
      fd.set('photo', p.file)
      fd.set('caption', caption)
      fd.set('photoDate', date)
      const r = await uploadContractorPhotoAction(fd).catch(() => ({ ok: false as const, error: 'Upload failed. Please try again.' }))
      if (!r.ok) {
        toast.error(r.error)
        break
      }
      added.push(r.photo)
      setProgress({ done: i + 1, total: picked.length })
    }
    if (added.length > 0) {
      await finishContractorPhotoUploadAction(contractor.id, added.length, caption).catch(() => null)
      toast.success(`${added.length} photo${added.length === 1 ? '' : 's'} added to ${contractor.name}'s Gallery`)
      setPhotos((list) => [...[...added].reverse(), ...(list ?? [])])
      // Drop the ones that went up; keep any that failed so they can be retried.
      setPicked((list) => {
        list.slice(0, added.length).forEach((p) => URL.revokeObjectURL(p.preview))
        return list.slice(added.length)
      })
      setCaption('')
    }
    setProgress(null)
  }

  async function remove(photo: ContractorPhoto) {
    if (!window.confirm("Delete this photo from the contractor's Gallery?")) return
    setDeleting(photo.id)
    const r = await deleteContractorPhotoAction(photo.id).catch(() => ({ ok: false as const, error: 'Could not delete the photo.' }))
    setDeleting(null)
    if (!r.ok) return void toast.error(r.error ?? 'Could not delete the photo.')
    setPhotos((list) => (list ?? []).filter((p) => p.id !== photo.id))
    toast.success('Photo deleted')
  }

  const uploading = progress !== null

  return (
    <Dialog open={open} onOpenChange={(o) => !uploading && onOpenChange(o)}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Photos</DialogTitle>
          <DialogDescription>
            Photos for {contractor.name}. They appear in the Gallery of the contractor&apos;s app, with the upload date printed on each photo.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-1">
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading || preparing}>
                {preparing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ImagePlus aria-hidden="true" />}
                {preparing ? 'Preparing…' : 'Choose photos'}
              </Button>
              <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                Date on photos: <strong className="text-ink">{stampLabel(today)}</strong>
              </span>
            </div>
            <input ref={inputRef} type="file" accept="image/*" multiple onChange={onPick} className="sr-only" aria-label="Choose photos" />

            {picked.length > 0 ? (
              <>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {picked.map((p) => (
                    <li key={p.key} className="relative overflow-hidden rounded-lg border border-border bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.preview} alt="" className="aspect-square w-full object-cover" />
                      {!uploading ? (
                        <button
                          type="button"
                          onClick={() => unpick(p.key)}
                          className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white"
                          aria-label="Remove this photo"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
                  Caption (optional)
                  <input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={200}
                    placeholder="e.g. Site visit, Sharma ji house"
                    className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm font-normal outline-none focus:border-brand"
                  />
                </label>
                <Button type="button" onClick={upload} disabled={uploading} className="h-10 self-start px-4">
                  {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
                  {progress
                    ? `Uploading ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`
                    : `Upload ${picked.length} photo${picked.length === 1 ? '' : 's'}`}
                </Button>
              </>
            ) : (
              <p className="text-xs text-ink-muted">Choose one or more photos (up to {MAX_FILES} at a time).</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-ink">In Gallery{photos ? ` (${photos.length})` : ''}</h3>
            {photos === null ? (
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading…
              </p>
            ) : photos.length === 0 ? (
              <p className="text-sm text-ink-muted">No photos yet.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {photos.map((p) => (
                  <li key={p.id} className="overflow-hidden rounded-lg border border-border bg-white">
                    <a href={p.url} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={p.caption ?? 'Photo'} className="aspect-square w-full object-cover" loading="lazy" />
                    </a>
                    <div className="flex items-center justify-between gap-1 px-2 py-1">
                      <span className="truncate text-[11px] text-ink-muted" title={p.caption ?? undefined}>
                        {fmtDate(p.date)}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(p)}
                        disabled={deleting === p.id}
                        className="flex size-6 shrink-0 items-center justify-center rounded text-ink-muted hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete photo"
                      >
                        {deleting === p.id ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="size-3.5" aria-hidden="true" />}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
