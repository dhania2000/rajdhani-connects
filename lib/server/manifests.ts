import { getPublicBranding } from './contractor-app'
import { logoVersion } from './branding'

/**
 * Web app manifests for the two installable apps ("Add shortcut" / Add to Home Screen):
 * the contractor app (/manifest.webmanifest) and the admin panel (/admin-manifest.webmanifest).
 * Read per request so names and icons follow Rewards Engine > App Content Control.
 */
async function base() {
  const { brandName, logoUrl } = await getPublicBranding()
  const v = logoVersion(logoUrl)
  return {
    brandName,
    common: {
      display: 'standalone',
      background_color: '#141b3d',
      theme_color: '#141b3d',
      icons: [
        // Built from the logo uploaded in App Content Control (or the built-in Rajdhani logo).
        { src: `/brand-icon/192?v=${v}`, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: `/brand-icon/512?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: `/brand-icon/maskable?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
  }
}

export async function contractorManifest() {
  const { brandName, common } = await base()
  return {
    id: '/contractor',
    name: brandName,
    short_name: brandName.length > 12 ? brandName.split(' ')[0] : brandName,
    description: `${brandName} contractor rewards: sales, points, gifts and offers.`,
    start_url: '/contractor',
    scope: '/',
    orientation: 'portrait',
    ...common,
  }
}

export async function adminManifest() {
  const { brandName, common } = await base()
  return {
    // A different id + scope makes the admin panel its own app, next to the contractor app.
    id: '/admin',
    name: `${brandName} Admin`,
    short_name: `${brandName.split(' ')[0]} Admin`,
    description: `${brandName} admin panel: contractors, sales, points and rewards.`,
    start_url: '/admin',
    scope: '/admin',
    ...common,
  }
}

export function manifestResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-cache' },
  })
}
