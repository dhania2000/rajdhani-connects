import type { MetadataRoute } from 'next'
import { getPublicBranding } from '@/lib/server/contractor-app'
import { logoVersion } from '@/lib/server/branding'

const HOME_SCREEN_NAME = 'Rajdhani Tiles'

// Read per request so the app name follows Rewards Engine > App content.
export const dynamic = 'force-dynamic'

/** Makes the contractor app installable ("Add shortcut" / Add to Home Screen). */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { brandName, logoUrl } = await getPublicBranding()
  const v = logoVersion(logoUrl)
  return {
    id: '/contractor',
    // Name under the icon when the app is added to the phone's home screen.
    name: HOME_SCREEN_NAME,
    short_name: HOME_SCREEN_NAME,
    description: `${brandName} contractor rewards: sales, points, gifts and offers.`,
    start_url: '/contractor',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#141b3d',
    theme_color: '#141b3d',
    icons: [
      // Built from the logo uploaded in App Content Control (or the built-in Rajdhani logo).
      { src: `/brand-icon/192?v=${v}`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `/brand-icon/512?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `/brand-icon/maskable?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
