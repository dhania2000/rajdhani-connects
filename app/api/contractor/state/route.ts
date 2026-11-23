import { NextResponse } from 'next/server'
import { getContractorSession } from '@/lib/server/auth'
import { getContractorState } from '@/lib/server/contractor-app'

export async function GET() {
  const session = await getContractorSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const state = await getContractorState(session.contractorId)
  return NextResponse.json(state, { headers: { 'Cache-Control': 'no-store' } })
}
