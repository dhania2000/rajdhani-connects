import { getMedia } from '@/lib/server/media'

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const media = await getMedia(key)
  if (!media) return new Response('Not found', { status: 404 })
  return new Response(new Uint8Array(media.data), {
    headers: {
      'Content-Type': media.mime_type,
      'Content-Length': String(media.data.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
