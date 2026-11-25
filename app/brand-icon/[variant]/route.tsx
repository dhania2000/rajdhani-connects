import { ImageResponse } from 'next/og'
import { getLogoDataUrl, getLogoUrl } from '@/lib/server/branding'

export const dynamic = 'force-dynamic'

/** size, share of the icon the logo fills, corner radius, and the built-in file used when no logo is uploaded. */
const VARIANTS = {
  favicon: { size: 64, fill: 0.86, radius: 12, fallback: '/icons/favicon-64.png' },
  apple: { size: 180, fill: 0.8, radius: 0, fallback: '/icons/apple-180.png' },
  '192': { size: 192, fill: 0.8, radius: 0, fallback: '/icons/icon-192.png' },
  '512': { size: 512, fill: 0.8, radius: 0, fallback: '/icons/icon-512.png' },
  // Android crops maskable icons to a circle, so the logo stays inside the safe zone.
  maskable: { size: 512, fill: 0.6, radius: 0, fallback: '/icons/icon-maskable-512.png' },
} as const

/** Favicon and home-screen icons built from the admin-uploaded logo on a white tile. */
export async function GET(_req: Request, { params }: { params: Promise<{ variant: string }> }) {
  const { variant: key } = await params
  const v = VARIANTS[key as keyof typeof VARIANTS]
  if (!v) return new Response('Not found', { status: 404 })

  const logo = await getLogoDataUrl(await getLogoUrl())
  // Relative Location: behind a proxy req.url can carry the internal host.
  if (!logo) return new Response(null, { status: 307, headers: { Location: v.fallback, 'Cache-Control': 'no-cache' } })

  const inner = Math.round(v.size * v.fill)
  const res = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: v.radius }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={inner} height={inner} style={{ objectFit: 'contain' }} alt="" />
      </div>
    ),
    { width: v.size, height: v.size },
  )
  // URLs carry ?v=<logo version>, so a changed logo gets a new URL; keep the cache short anyway.
  res.headers.set('Cache-Control', 'public, max-age=3600')
  return res
}
