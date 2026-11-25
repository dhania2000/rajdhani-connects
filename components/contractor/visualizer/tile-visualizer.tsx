'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, Download, ImagePlus, Plus, RotateCcw, ShoppingCart, Trash2 } from 'lucide-react'
import type { Product } from '@/lib/types'
import { useCart } from '@/components/contractor/cart/cart-store'
import { cn } from '@/lib/utils'
import { drawWarped, orderCorners, pointInQuad, quadAspect, type Pt, type Quad } from './warp'

interface Area {
  id: number
  /** Corners in photo pixels; 4 once placed (TL, TR, BR, BL). */
  points: Pt[]
  productId: string
  tilesAcross: number
  grout: boolean
}

const MAX_SIDE = 1600
const PATTERN_W = 1024

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    if (/^https?:\/\//.test(src) && !src.startsWith(window.location.origin)) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Try catalogue tiles on your own photo: upload a wall/floor/room photo, tap the 4 corners of an
 * area, pick a tile. Several areas (e.g. floor + wall) can each have their own tile. The photo stays
 * on the phone; nothing is uploaded.
 */
export function TileVisualizer({ products }: { products: Product[] }) {
  const { add, quantityOf } = useCart()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLCanvasElement | null>(null)
  const shadingRef = useRef<HTMLCanvasElement | null>(null)
  const textures = useRef(new Map<string, HTMLImageElement>())
  const dragRef = useRef<{ areaId: number; index: number } | null>(null)
  const nextId = useRef(1)

  const [photoSize, setPhotoSize] = useState<{ w: number; h: number } | null>(null)
  const [areas, setAreas] = useState<Area[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [lighting, setLighting] = useState(0.55)
  const [texturesReady, setTexturesReady] = useState(0)
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState(false)

  const active = areas.find((a) => a.id === activeId) ?? null
  const placing = active !== null && active.points.length < 4
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  // Load each tile texture once.
  useEffect(() => {
    for (const p of products) {
      if (!p.texture || textures.current.has(p.id)) continue
      loadImage(p.texture)
        .then((img) => {
          textures.current.set(p.id, img)
          setTexturesReady((n) => n + 1)
        })
        .catch(() => {})
    }
  }, [products])

  const newArea = useCallback(
    (productId?: string): Area => ({
      id: nextId.current++,
      points: [],
      productId: productId ?? products[0]?.id ?? '',
      tilesAcross: 8,
      grout: true,
    }),
    [products],
  )

  async function onPhoto(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const url = URL.createObjectURL(file)
      const img = await loadImage(url)
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
      const w = Math.round(img.naturalWidth * scale)
      const h = Math.round(img.naturalHeight * scale)
      const photo = document.createElement('canvas')
      photo.width = w
      photo.height = h
      photo.getContext('2d')!.drawImage(img, 0, 0, w, h)
      photoRef.current = photo

      // Brightness-only copy of the photo, normalised so mid-grey walls become near white.
      // Multiplying it over the tiles keeps the room's shadows and light without tinting them.
      const shade = document.createElement('canvas')
      shade.width = w
      shade.height = h
      const sctx = shade.getContext('2d')!
      sctx.drawImage(photo, 0, 0)
      const data = sctx.getImageData(0, 0, w, h)
      let sum = 0
      for (let i = 0; i < data.data.length; i += 4) sum += 0.299 * data.data[i] + 0.587 * data.data[i + 1] + 0.114 * data.data[i + 2]
      const avg = sum / (data.data.length / 4) || 128
      const k = 225 / avg
      for (let i = 0; i < data.data.length; i += 4) {
        const l = Math.min(255, (0.299 * data.data[i] + 0.587 * data.data[i + 1] + 0.114 * data.data[i + 2]) * k)
        data.data[i] = data.data[i + 1] = data.data[i + 2] = l
      }
      sctx.putImageData(data, 0, 0)
      shadingRef.current = shade

      const first = newArea()
      setAreas([first])
      setActiveId(first.id)
      setPhotoSize({ w, h })
      setAdded(false)
    } finally {
      setBusy(false)
    }
  }

  /** Flat repeating tile pattern for an area, sized to the area's proportions. */
  const buildPattern = useCallback(
    (area: Area, quad: Quad) => {
      const product = productById.get(area.productId)
      const tex = textures.current.get(area.productId)
      if (!product || !tex) return null
      const aspect = quadAspect(quad)
      const pw = PATTERN_W
      const ph = Math.max(64, Math.min(4096, Math.round(pw / aspect)))
      const tileRatio = product.tileSizeMm ? product.tileSizeMm.height / product.tileSizeMm.width : 1
      const tw = pw / area.tilesAcross
      const th = tw * tileRatio
      const c = document.createElement('canvas')
      c.width = pw
      c.height = ph
      const ctx = c.getContext('2d')!
      for (let y = 0; y < ph; y += th) for (let x = 0; x < pw; x += tw) ctx.drawImage(tex, x, y, tw + 0.5, th + 0.5)
      if (area.grout) {
        ctx.strokeStyle = 'rgba(225, 225, 220, 0.9)'
        ctx.lineWidth = Math.max(1.5, tw * 0.025)
        ctx.beginPath()
        for (let x = 0; x <= pw + 1; x += tw) {
          ctx.moveTo(x, 0)
          ctx.lineTo(x, ph)
        }
        for (let y = 0; y <= ph + 1; y += th) {
          ctx.moveTo(0, y)
          ctx.lineTo(pw, y)
        }
        ctx.stroke()
      }
      return c
    },
    [productById],
  )

  const render = useCallback(
    (withOverlay: boolean) => {
      const canvas = canvasRef.current
      const photo = photoRef.current
      if (!canvas || !photo) return
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.drawImage(photo, 0, 0)

      for (const area of areas) {
        if (area.points.length !== 4) continue
        const quad = area.points as Quad
        const pattern = buildPattern(area, quad)
        if (!pattern) continue
        drawWarped(ctx, pattern, pattern.width, pattern.height, quad, 14)
        if (shadingRef.current && lighting > 0) {
          ctx.save()
          ctx.beginPath()
          quad.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
          ctx.closePath()
          ctx.clip()
          ctx.globalCompositeOperation = 'multiply'
          ctx.globalAlpha = lighting
          ctx.drawImage(shadingRef.current, 0, 0)
          ctx.restore()
        }
      }

      if (!withOverlay) return
      const r = Math.max(8, photo.width / 70)
      for (const area of areas) {
        const isActive = area.id === activeId
        if (area.points.length >= 2) {
          ctx.save()
          ctx.lineWidth = Math.max(2, photo.width / 400)
          ctx.strokeStyle = isActive ? '#6d28d9' : 'rgba(255,255,255,0.7)'
          ctx.setLineDash(isActive ? [] : [r, r / 1.5])
          ctx.beginPath()
          area.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
          if (area.points.length === 4) ctx.closePath()
          ctx.stroke()
          ctx.restore()
        }
        if (!isActive) continue
        for (const p of area.points) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
          ctx.fillStyle = '#ffffff'
          ctx.fill()
          ctx.lineWidth = Math.max(2, r / 3)
          ctx.strokeStyle = '#6d28d9'
          ctx.stroke()
        }
      }
    },
    [areas, activeId, lighting, buildPattern],
  )

  useEffect(() => {
    render(true)
  }, [render, texturesReady, photoSize])

  /** Tap position in photo pixels; taps on or just outside the edge snap to the edge so corners are easy to hit. */
  function toPhoto(e: React.PointerEvent<HTMLDivElement>): Pt {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height
    return { x: Math.min(canvas.width, Math.max(0, x)), y: Math.min(canvas.height, Math.max(0, y)) }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!photoRef.current) return
    const p = toPhoto(e)
    const canvas = canvasRef.current!
    const hit = (Math.max(8, canvas.width / 70) * 2.2) as number

    if (active && placing) {
      // Read the latest points inside the updater so quick successive taps never overwrite each other.
      setAreas((all) =>
        all.map((a) => {
          if (a.id !== active.id || a.points.length >= 4) return a
          const points = [...a.points, p]
          return { ...a, points: points.length === 4 ? orderCorners(points) : points }
        }),
      )
      return
    }
    if (active) {
      const index = active.points.findIndex((q) => Math.hypot(q.x - p.x, q.y - p.y) < hit)
      if (index >= 0) {
        dragRef.current = { areaId: active.id, index }
        e.currentTarget.setPointerCapture(e.pointerId)
        return
      }
    }
    const tapped = [...areas].reverse().find((a) => a.points.length === 4 && pointInQuad(p, a.points as Quad))
    if (tapped) setActiveId(tapped.id)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    const p = toPhoto(e)
    setAreas((all) => all.map((a) => (a.id === drag.areaId ? { ...a, points: a.points.map((q, i) => (i === drag.index ? p : q)) } : a)))
  }

  function onPointerUp() {
    dragRef.current = null
  }

  const update = (patch: Partial<Area>) => active && setAreas((all) => all.map((a) => (a.id === active.id ? { ...a, ...patch } : a)))

  function addArea() {
    const area = newArea(active?.productId)
    setAreas((all) => [...all, area])
    setActiveId(area.id)
  }

  function removeArea() {
    if (!active) return
    const rest = areas.filter((a) => a.id !== active.id)
    setAreas(rest)
    setActiveId(rest.at(-1)?.id ?? null)
  }

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    render(false)
    try {
      const url = canvas.toDataURL('image/jpeg', 0.9)
      const a = document.createElement('a')
      a.href = url
      a.download = 'tile-preview.jpg'
      a.click()
    } finally {
      render(true)
    }
  }

  const usedProducts = [...new Set(areas.filter((a) => a.points.length === 4).map((a) => a.productId))]
    .map((id) => productById.get(id))
    .filter((p): p is Product => Boolean(p))

  function addToCart() {
    for (const p of usedProducts) if (quantityOf(p.id) === 0) add(p)
    setAdded(true)
  }

  if (products.length === 0) {
    return (
      <main className="flex flex-col gap-3 p-4">
        <div className="rounded-xl bg-white p-5 text-center shadow-[0_1px_3px_rgba(28,35,64,0.08)]">
          <p className="text-sm font-semibold text-ink">Tile Visualizer is coming soon</p>
          <p className="mt-1 text-[13px] text-ink-muted">The store hasn&apos;t added tile textures yet.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col gap-3 p-4">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />

      {!photoSize ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand/40 bg-white px-6 py-10 text-center"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-lavender text-brand">
            <Camera className="size-7" aria-hidden="true" />
          </span>
          <span className="text-[15px] font-bold text-ink">{busy ? 'Loading photo…' : 'Upload a photo'}</span>
          <span className="text-[13px] text-ink-muted">Take or choose a photo of a wall, floor, room or outdoor area. It stays on your phone.</span>
        </button>
      ) : (
        <>
          <p className="rounded-lg bg-lavender px-3 py-2 text-[12px] text-ink">
            {placing
              ? `Tap the ${['first', 'second', 'third', 'fourth'][active!.points.length]} corner of the wall or floor (${active!.points.length}/4).`
              : 'Drag the white corners to adjust. Tap another area to edit it, or add a new area for a different tile.'}
          </p>
          {/* The padded wrapper takes the taps, so the photo's very edges and corners can be tapped too. */}
          <div
            className="-m-3 touch-none p-3"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <canvas
              ref={canvasRef}
              width={photoSize.w}
              height={photoSize.h}
              className="block w-full rounded-xl bg-black/5 shadow-[0_1px_4px_rgba(28,35,64,0.12)]"
              aria-label="Your photo with tiles applied"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Areas">
            {areas.map((a, i) => (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={a.id === activeId}
                onClick={() => setActiveId(a.id)}
                className={cn(
                  'h-8 rounded-full px-3 text-[12px] font-semibold',
                  a.id === activeId ? 'bg-brand-strong text-white' : 'border border-border bg-white text-ink',
                )}
              >
                Area {i + 1}
                {a.points.length < 4 ? ' · placing' : ''}
              </button>
            ))}
            <button type="button" onClick={addArea} className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-brand/50 px-3 text-[12px] font-semibold text-brand">
              <Plus className="size-3.5" aria-hidden="true" />
              Add area
            </button>
          </div>

          {active && (
            <section className="flex flex-col gap-3 rounded-xl bg-white p-3.5 shadow-[0_1px_3px_rgba(28,35,64,0.08)]">
              <p className="text-[13px] font-semibold text-ink">Tile for this area</p>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {products.map((p) => {
                  const selected = p.id === active.productId
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => update({ productId: p.id })}
                      aria-pressed={selected}
                      className={cn('w-20 shrink-0 rounded-lg border-2 p-1 text-left', selected ? 'border-brand' : 'border-transparent')}
                    >
                      <span className="relative block aspect-square overflow-hidden rounded-md bg-app-bg">
                        <img src={p.texture} alt="" className="size-full object-cover" />
                        {selected && (
                          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-brand text-white">
                            <Check className="size-3" aria-hidden="true" />
                          </span>
                        )}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[10px] leading-tight font-medium text-ink">{p.name}</span>
                    </button>
                  )
                })}
              </div>

              <label className="text-[12px] font-medium text-ink-muted">
                Tile size: {active.tilesAcross} tiles across
                <input
                  type="range"
                  min={2}
                  max={30}
                  value={active.tilesAcross}
                  onChange={(e) => update({ tilesAcross: Number(e.target.value) })}
                  className="mt-1 w-full accent-brand"
                />
              </label>
              <label className="text-[12px] font-medium text-ink-muted">
                Room lighting on tiles: {Math.round(lighting * 100)}%
                <input type="range" min={0} max={0.9} step={0.05} value={lighting} onChange={(e) => setLighting(Number(e.target.value))} className="mt-1 w-full accent-brand" />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex h-8 items-center gap-2 rounded-full border border-border px-3 text-[12px] font-medium text-ink">
                  <input type="checkbox" checked={active.grout} onChange={(e) => update({ grout: e.target.checked })} className="accent-brand" />
                  Grout lines
                </label>
                <button type="button" onClick={() => update({ points: [] })} className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-[12px] font-medium text-ink">
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  Redo corners
                </button>
                <button type="button" onClick={removeArea} className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-[12px] font-medium text-danger">
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  Remove area
                </button>
              </div>
            </section>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-white text-[13px] font-semibold text-ink">
              <ImagePlus className="size-4" aria-hidden="true" />
              Change photo
            </button>
            <button
              type="button"
              onClick={download}
              disabled={usedProducts.length === 0}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-white text-[13px] font-semibold text-ink disabled:opacity-50"
            >
              <Download className="size-4" aria-hidden="true" />
              Save image
            </button>
          </div>
          {usedProducts.length > 0 && (
            <button
              type="button"
              onClick={addToCart}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-strong text-sm font-semibold text-white"
            >
              <ShoppingCart className="size-4" aria-hidden="true" />
              {added ? 'Added to cart' : `Add ${usedProducts.length === 1 ? 'this tile' : `these ${usedProducts.length} tiles`} to cart`}
            </button>
          )}
        </>
      )}
    </main>
  )
}
