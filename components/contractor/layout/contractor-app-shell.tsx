import { ContractorProvider } from '@/components/contractor/contractor-store'
import type { ContractorAppState } from '@/lib/server/contractor-app'
import { BottomNavigation } from './bottom-navigation'
import { InstallPrompt } from './install-prompt'

export function ContractorAppShell({
  initialState,
  children,
}: {
  initialState: ContractorAppState
  children: React.ReactNode
}) {
  return (
    <ContractorProvider initialState={initialState}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col bg-app-bg text-ink shadow-[0_0_40px_rgba(23,28,73,0.12)]">
        <div className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))]">{children}</div>
        <BottomNavigation />
        <InstallPrompt />
      </div>
    </ContractorProvider>
  )
}
