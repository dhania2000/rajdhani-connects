import { adminManifest, manifestResponse } from '@/lib/server/manifests'

// Outside /admin so it loads without an admin session (the login page links it too).
export const dynamic = 'force-dynamic'

export async function GET() {
  return manifestResponse(await adminManifest())
}
