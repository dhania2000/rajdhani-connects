/** Geometry helpers for drawing a flat tile pattern onto a 4-corner area of a photo in perspective. */

export interface Pt {
  x: number
  y: number
}

/** Corner order: top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Pt, Pt, Pt, Pt]

/** Projective map from the unit square to `q` (Heckbert's square-to-quad). */
export function squareToQuad(q: Quad) {
  const [p0, p1, p2, p3] = q
  const sx = p0.x - p1.x + p2.x - p3.x
  const sy = p0.y - p1.y + p2.y - p3.y
  let a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
    a = p1.x - p0.x
    b = p3.x - p0.x
    c = p0.x
    d = p1.y - p0.y
    e = p3.y - p0.y
    f = p0.y
    g = 0
    h = 0
  } else {
    const dx1 = p1.x - p2.x
    const dx2 = p3.x - p2.x
    const dy1 = p1.y - p2.y
    const dy2 = p3.y - p2.y
    const den = dx1 * dy2 - dx2 * dy1 || 1e-9
    g = (sx * dy2 - dx2 * sy) / den
    h = (dx1 * sy - sx * dy1) / den
    a = p1.x - p0.x + g * p1.x
    b = p3.x - p0.x + h * p3.x
    c = p0.x
    d = p1.y - p0.y + g * p1.y
    e = p3.y - p0.y + h * p3.y
    f = p0.y
  }
  return (u: number, v: number): Pt => {
    const w = g * u + h * v + 1
    return { x: (a * u + b * v + c) / w, y: (d * u + e * v + f) / w }
  }
}

/** Puts 4 tapped points into TL, TR, BR, BL order so the area never twists. */
export function orderCorners(points: Pt[]): Quad {
  const cx = points.reduce((n, p) => n + p.x, 0) / points.length
  const cy = points.reduce((n, p) => n + p.y, 0) / points.length
  const sorted = [...points].sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx))
  // atan2 order runs clockwise on screen starting from the left; rotate so the top-left-most comes first.
  let start = 0
  let best = Infinity
  sorted.forEach((p, i) => {
    const score = p.x + p.y
    if (score < best) {
      best = score
      start = i
    }
  })
  const q = [0, 1, 2, 3].map((i) => sorted[(start + i) % 4]) as Quad
  return q
}

export function pointInQuad(p: Pt, q: Quad) {
  let inside = false
  for (let i = 0, j = 3; i < 4; j = i++) {
    const a = q[i]
    const b = q[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

/** Rough real-world width/height ratio of the marked area (average of opposite sides). */
export function quadAspect(q: Quad) {
  const w = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2
  const h = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2
  return h > 0 ? w / h : 1
}

/** Draws `src` (a flat W x H image) onto `q`, splitting it into small triangles each drawn with an affine transform. */
export function drawWarped(ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, q: Quad, steps = 12) {
  const map = squareToQuad(q)
  const grid: Pt[][] = []
  for (let j = 0; j <= steps; j++) {
    const row: Pt[] = []
    for (let i = 0; i <= steps; i++) row.push(map(i / steps, j / steps))
    grid.push(row)
  }
  for (let j = 0; j < steps; j++) {
    for (let i = 0; i < steps; i++) {
      const s00 = { x: (i / steps) * sw, y: (j / steps) * sh }
      const s10 = { x: ((i + 1) / steps) * sw, y: (j / steps) * sh }
      const s11 = { x: ((i + 1) / steps) * sw, y: ((j + 1) / steps) * sh }
      const s01 = { x: (i / steps) * sw, y: ((j + 1) / steps) * sh }
      const d00 = grid[j][i]
      const d10 = grid[j][i + 1]
      const d11 = grid[j + 1][i + 1]
      const d01 = grid[j + 1][i]
      drawTriangle(ctx, src, [s00, s10, s11], [d00, d10, d11])
      drawTriangle(ctx, src, [s00, s11, s01], [d00, d11, d01])
    }
  }
}

function drawTriangle(ctx: CanvasRenderingContext2D, src: CanvasImageSource, s: [Pt, Pt, Pt], d: [Pt, Pt, Pt]) {
  const [s0, s1, s2] = s
  const [d0, d1, d2] = d
  const su1x = s1.x - s0.x
  const su1y = s1.y - s0.y
  const su2x = s2.x - s0.x
  const su2y = s2.y - s0.y
  const det = su1x * su2y - su2x * su1y
  if (Math.abs(det) < 1e-9) return
  const du1x = d1.x - d0.x
  const du1y = d1.y - d0.y
  const du2x = d2.x - d0.x
  const du2y = d2.y - d0.y
  const a = (du1x * su2y - du2x * su1y) / det
  const b = (du1y * su2y - du2y * su1y) / det
  const c = (su1x * du2x - su2x * du1x) / det
  const dd = (su1x * du2y - su2x * du1y) / det
  const e = d0.x - a * s0.x - c * s0.y
  const f = d0.y - b * s0.x - dd * s0.y

  // Grow the clip triangle slightly outwards so neighbouring triangles overlap and no seams show.
  const cx = (d0.x + d1.x + d2.x) / 3
  const cy = (d0.y + d1.y + d2.y) / 3
  const grow = (p: Pt) => {
    const dx = p.x - cx
    const dy = p.y - cy
    const len = Math.hypot(dx, dy) || 1
    return { x: p.x + (dx / len) * 0.8, y: p.y + (dy / len) * 0.8 }
  }
  const g0 = grow(d0)
  const g1 = grow(d1)
  const g2 = grow(d2)

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(g0.x, g0.y)
  ctx.lineTo(g1.x, g1.y)
  ctx.lineTo(g2.x, g2.y)
  ctx.closePath()
  ctx.clip()
  ctx.transform(a, b, c, dd, e, f)
  ctx.drawImage(src, 0, 0)
  ctx.restore()
}
