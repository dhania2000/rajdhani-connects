import { AppHeader } from '@/components/contractor/layout/app-header'
import { ContractorWelcomeCard } from '@/components/contractor/dashboard/contractor-welcome-card'
import { RewardBalanceCard } from '@/components/contractor/dashboard/reward-balance-card'
import { QuickActionsGrid } from '@/components/contractor/dashboard/quick-actions-grid'
import { PerformanceCard } from '@/components/contractor/dashboard/performance-card'

export default function ContractorHomePage() {
  return (
    <>
      <AppHeader />
      <main className="flex flex-col">
        <ContractorWelcomeCard />
        <div className="flex flex-col gap-3 px-3 pt-3 pb-4">
          <RewardBalanceCard />
          <QuickActionsGrid />
          <div className="pt-1.5">
            <PerformanceCard />
          </div>
        </div>
      </main>
    </>
  )
}
