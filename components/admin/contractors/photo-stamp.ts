/** Formats a date like "25 Nov 2026". */
export function stampLabel(d: Date) {
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Local date as YYYY-MM-DD. */
export function localIsoDate(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const MAX_SIDE = 1600

/**
 * Shrinks a photo to at most 1600 px and prints the upload date in the bottom-right corner,
 * so the date stays on the picture wherever it is viewed or shared.
 */
export async function stampPhoto(file: File, date: Date): Promise<File> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('unreadable'))
      i.src = url
    })
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, w, h)

    const label = stampLabel(date)
    // ~3% of the long side (48 px on a 1600 px photo), but never taller than a quarter of a thin strip.
    const size = Math.max(14, Math.round(Math.min(Math.max(w, h) * 0.03, Math.min(w, h) * 0.25)))
    ctx.font = `600 ${size}px Inter, Arial, sans-serif`
    const padX = Math.round(size * 0.6)
    const padY = Math.round(size * 0.4)
    const boxW = Math.ceil(ctx.measureText(label).width) + padX * 2
    const boxH = size + padY * 2
    const margin = Math.round(size * 0.6)
    const x = w - boxW - margin
    const y = h - boxH - margin
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.beginPath()
    ctx.roundRect(x, y, boxW, boxH, Math.round(size * 0.35))
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x + padX, y + boxH / 2 + 1)

    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
    if (!blob) throw new Error('convert failed')
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(url)
  }
}
