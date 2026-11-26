import { AppHeader } from '@/components/contractor/layout/app-header'
import { ContractorWelcomeCard } from '@/components/contractor/dashboard/contractor-welcome-card'
import { RewardBalanceCard } from '@/components/contractor/dashboard/reward-balance-card'
import { QuickActionsGrid } from '@/components/contractor/dashboard/quick-actions-grid'
import { PerformanceCard } from '@/components/contractor/dashboard/performance-card'
import { getGifts } from '@/lib/server/contractor-app'

export default async function ContractorHomePage() {
  // Gifts that can be claimed right now (in stock), for the "X pts away from …" line on the rewards card.
  const gifts = (await getGifts().catch(() => []))
    .filter((g) => g.availability !== 'out-of-stock' && g.points > 0)
    .map(({ id, name, points, image }) => ({ id, name, points, image }))
  return (
    <>
      <AppHeader />
      <main className="flex flex-col">
        <ContractorWelcomeCard />
        <div className="flex flex-col gap-3 px-3 pt-3 pb-4">
          <RewardBalanceCard gifts={gifts} />
          <QuickActionsGrid />
          <div className="pt-1.5">
            <PerformanceCard />
          </div>
        </div>
      </main>
    </>
  )
}
