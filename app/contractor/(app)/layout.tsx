import { ContractorAppShell } from '@/components/contractor/layout/contractor-app-shell'
import { requireContractor } from '@/lib/server/auth'
import { getContractorState } from '@/lib/server/contractor-app'

export const dynamic = 'force-dynamic'

export default async function ContractorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireContractor()
  const initialState = await getContractorState(session.contractorId)
  return <ContractorAppShell initialState={initialState}>{children}</ContractorAppShell>
}
