import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { LedgerView } from '@/components/contractor/ledger/ledger-view'
import { EmptyState } from '@/components/contractor/shared/empty-state'
import { requireContractor } from '@/lib/server/auth'
import { getAppContent } from '@/lib/server/admin-rewards'
import { getContractorAccountLedger } from '@/lib/server/catalogue-admin'

export const metadata: Metadata = { title: 'My Ledger – Rajdhani Connects' }

export default async function LedgerPage() {
  const session = await requireContractor()
  const content = await getAppContent()
  const ledger = content.ledgerComingSoon ? null : await getContractorAccountLedger(session.contractorId)

  return (
    <>
      <PageHeader title="My Ledger" subtitle="Udhar / Advance" />
      {ledger ? (
        <LedgerView openingBalance={ledger.openingBalance} entries={ledger.entries} />
      ) : (
        <main className="p-4">
          <EmptyState title="Coming soon" description={content.ledgerMessage} />
        </main>
      )}
    </>
  )
}
