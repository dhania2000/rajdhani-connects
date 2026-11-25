'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Images, X } from 'lucide-react'
import type { ContractorPhoto } from '@/lib/server/contractor-photos'

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

/** Photos grouped by upload date (newest first); tap one to see it full screen. */
export function GalleryView({ photos }: { photos: ContractorPhoto[] }) {
  const [index, setIndex] = useState<number | null>(null)

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-8 py-20 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-lavender text-brand">
          <Images className="size-8" aria-hidden="true" />
        </span>
        <p className="text-base font-semibold text-ink">No photos yet</p>
        <p className="text-sm text-ink-muted">Photos the store shares with you will show up here.</p>
      </div>
    )
  }

  const groups: { date: string; items: { photo: ContractorPhoto; i: number }[] }[] = []
  photos.forEach((photo, i) => {
    const last = groups[groups.length - 1]
    if (last && last.date === photo.date) last.items.push({ photo, i })
    else groups.push({ date: photo.date, items: [{ photo, i }] })
  })

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-6">
      <p className="text-xs text-ink-muted">
        {photos.length} photo{photos.length === 1 ? '' : 's'}
      </p>
      {groups.map((g) => (
        <section key={g.date} className="flex flex-col gap-2" aria-label={fmtDate(g.date)}>
          <h2 className="text-sm font-semibold text-ink">{fmtDate(g.date)}</h2>
          <ul className="grid grid-cols-3 gap-1.5">
            {g.items.map(({ photo, i }) => (
              <li key={photo.id}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  className="block w-full overflow-hidden rounded-lg bg-white focus-visible:outline-2 focus-visible:outline-brand"
                  aria-label={`Open photo from ${fmtDate(photo.date)}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.caption ?? ''} loading="lazy" className="aspect-square w-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
          {g.items[0].photo.caption ? <p className="text-xs text-ink-muted">{g.items[0].photo.caption}</p> : null}
        </section>
      ))}
      {index !== null ? <Viewer photos={photos} index={index} onIndex={setIndex} onClose={() => setIndex(null)} /> : null}
    </div>
  )
}

function Viewer({ photos, index, onIndex, onClose }: { photos: ContractorPhoto[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const photo = photos[index]
  const startX = useRef<number | null>(null)
  const hasPrev = index > 0
  const hasNext = index < photos.length - 1

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onIndex(index - 1)
      if (e.key === 'ArrowRight' && hasNext) onIndex(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [index, hasPrev, hasNext, onIndex, onClose])

  return (
    <div role="dialog" aria-modal="true" aria-label="Photo" className="fixed inset-0 z-[70] flex flex-col bg-black text-white">
      <div className="flex items-center justify-between gap-2 px-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-2">
        <button type="button" onClick={onClose} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10" aria-label="Close">
          <X className="size-6" aria-hidden="true" />
        </button>
        <p className="text-sm font-medium tabular-nums">
          {index + 1} / {photos.length}
        </p>
        <a href={photo.url} download={`photo-${photo.date}-${photo.id}.jpg`} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10" aria-label="Download photo">
          <Download className="size-5" aria-hidden="true" />
        </a>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (startX.current === null) return
          const dx = e.changedTouches[0].clientX - startX.current
          startX.current = null
          if (dx > 50 && hasPrev) onIndex(index - 1)
          if (dx < -50 && hasNext) onIndex(index + 1)
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={photo.caption ?? ''} className="max-h-full max-w-full object-contain" />
        {hasPrev ? (
          <button type="button" onClick={() => onIndex(index - 1)} className="absolute left-2 flex size-10 items-center justify-center rounded-full bg-black/50" aria-label="Previous photo">
            <ChevronLeft className="size-6" aria-hidden="true" />
          </button>
        ) : null}
        {hasNext ? (
          <button type="button" onClick={() => onIndex(index + 1)} className="absolute right-2 flex size-10 items-center justify-center rounded-full bg-black/50" aria-label="Next photo">
            <ChevronRight className="size-6" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-center">
        <p className="text-sm font-semibold">{fmtDate(photo.date)}</p>
        {photo.caption ? <p className="mt-0.5 text-xs text-white/75">{photo.caption}</p> : null}
      </div>
    </div>
  )
}
