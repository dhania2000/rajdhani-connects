import { isDbConfigured } from './db'
import { getAppContent } from './admin-rewards'
import { getMedia } from './media'

/** The admin-uploaded logo URL ('' = built-in Rajdhani logo). Never throws. */
export async function getLogoUrl() {
  if (!isDbConfigured()) return ''
  try {
    return (await getAppContent()).logoUrl
  } catch {
    return ''
  }
}

/** Short version tag for icon URLs so phones and browsers fetch the new icon after the logo changes. */
export function logoVersion(logoUrl: string) {
  const key = logoUrl.match(/([a-f0-9]{32})$/)?.[1]
  return key ? key.slice(0, 10) : 'default'
}

/** The uploaded logo as a data URL for icon rendering (PNG/JPEG only), or null to use the built-in icons. */
export async function getLogoDataUrl(logoUrl: string) {
  const key = logoUrl.match(/^\/api\/media\/([a-f0-9]{32})$/)?.[1]
  if (!key) return null
  const media = await getMedia(key).catch(() => null)
  if (!media || !['image/png', 'image/jpeg'].includes(media.mime_type)) return null
  return `data:${media.mime_type};base64,${Buffer.from(media.data).toString('base64')}`
}
