import type { MetadataRoute } from 'next'
import { getPublicBranding } from '@/lib/server/contractor-app'

// Read per request so the app name follows Rewards Engine > App content.
export const dynamic = 'force-dynamic'

/** Makes the contractor app installable ("Add shortcut" / Add to Home Screen). */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { brandName } = await getPublicBranding()
  return {
    id: '/contractor',
    name: brandName,
    short_name: brandName.length > 12 ? brandName.split(' ')[0] : brandName,
    description: `${brandName} contractor rewards: sales, points, gifts and offers.`,
    start_url: '/contractor',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#141b3d',
    theme_color: '#141b3d',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
