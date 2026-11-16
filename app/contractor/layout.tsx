import { ContractorAppShell } from '@/components/contractor/layout/contractor-app-shell'

export default function ContractorLayout({ children }: { children: React.ReactNode }) {
  return <ContractorAppShell>{children}</ContractorAppShell>
}
