import { contractorManifest, manifestResponse } from '@/lib/server/manifests'

// Same URL as before, so apps already added to phones keep getting updates.
export const dynamic = 'force-dynamic'

export async function GET() {
  return manifestResponse(await contractorManifest())
}
