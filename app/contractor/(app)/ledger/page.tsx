import type { Metadata } from 'next'
import { PageHeader } from '@/components/contractor/layout/page-header'
import { LedgerView } from '@/components/contractor/ledger/ledger-view'

export const metadata: Metadata = { title: 'My Ledger – Rajdhani Tiles & Sanitary' }

export default function LedgerPage() {
  return (
    <>
      <PageHeader title="My Ledger" subtitle="Udhar / Advance" />
      <LedgerView />
    </>
  )
}
