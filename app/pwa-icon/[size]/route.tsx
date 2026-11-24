import { ImageResponse } from 'next/og'

const VARIANTS = {
  '192': { size: 192, mark: 0.72 },
  '512': { size: 512, mark: 0.72 },
  // Maskable icons get cropped to a circle/squircle on Android, so the mark sits in the safe zone.
  maskable: { size: 512, mark: 0.5 },
} as const

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((size) => ({ size }))
}

/** Home-screen icons for the installed contractor app: the diamond mark on the brand navy. */
export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: key } = await params
  const variant = VARIANTS[key as keyof typeof VARIANTS]
  if (!variant) return new Response('Not found', { status: 404 })
  const mark = Math.round(variant.size * variant.mark)

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#171c49' }}>
        <svg width={mark} height={mark} viewBox="0 0 40 40">
          <path d="M20 3 L37 20 L20 20 Z" fill="#ffffff" />
          <path d="M37 20 L20 37 L20 20 Z" fill="#ffffff" fillOpacity="0.7" />
          <path d="M20 37 L3 20 L20 20 Z" fill="#ffffff" />
          <path d="M3 20 L20 3 L20 20 Z" fill="#ffffff" fillOpacity="0.55" />
          <path d="M20 11 L29 20 L20 29 L11 20 Z" fill="#171c49" />
          <path d="M20 15 L25 20 L20 25 L15 20 Z" fill="#ffffff" fillOpacity="0.85" />
        </svg>
      </div>
    ),
    { width: variant.size, height: variant.size },
  )
}
