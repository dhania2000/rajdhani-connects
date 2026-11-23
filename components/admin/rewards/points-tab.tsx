import Link from 'next/link'
import { listContractorOptions, listRecentTransactions } from '@/lib/server/admin-rewards'
import { listProductOptions } from '@/lib/server/catalogue-admin'
import { ProductPicker } from '@/components/admin/product-picker'
import { ActionForm } from '@/components/admin/action-form'
import { FormGrid, SelectInput, TextInput } from '@/components/admin/fields'
import { DataTable, EmptyState, fmtDate, fmtNumber, Panel, Td } from '@/components/admin/ui'
import { adjustPointsAction, bulkAdjustPointsAction } from '@/app/admin/(panel)/panel-actions'
import { ContractorMultiPicker } from './contractor-multi-picker'

export async function PointsTab() {
  const [contractors, txns, products] = await Promise.all([listContractorOptions(), listRecentTransactions(100), listProductOptions()])

  return (
    <>
      <Panel title="Assign or deduct" description="Points and tokens are separate balances. Every adjustment is an immutable ledger entry with your name and reason.">
        {contractors.length === 0 ? (
          <EmptyState title="No contractors" />
        ) : (
          <ActionForm action={adjustPointsAction} submitLabel="Post adjustment">
            <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
            <ProductPicker products={products} fill={{ reason: 'label' }} hint="Optional: puts the product name in the reason." />
            <FormGrid>
              <SelectInput label="Contractor" name="id" required options={contractors.map((c) => ({ value: c.id, label: `${c.name} (${c.contractor_code})` }))} />
              <SelectInput label="Currency" name="currency" options={[{ value: 'points', label: 'Reward points' }, { value: 'tokens', label: 'Reward tokens' }]} />
              <SelectInput label="Type" name="direction" options={[{ value: 'credit', label: 'Credit (assign)' }, { value: 'debit', label: 'Debit (deduct)' }]} />
              <TextInput label="Amount" name="amount" type="number" min={1} required />
              <TextInput label="Reason" name="reason" required minLength={5} className="sm:col-span-2" />
            </FormGrid>
          </ActionForm>
        )}
      </Panel>

      <Panel
        title="Bulk assign or deduct"
        description="Post the same amount to every active contractor or to the ones you pick. Each contractor gets their own ledger entry and, for credits, an in-app notification."
      >
        {contractors.length === 0 ? (
          <EmptyState title="No contractors" />
        ) : (
          <ActionForm action={bulkAdjustPointsAction} submitLabel="Post to all recipients">
            <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
            <ContractorMultiPicker contractors={contractors} />
            <ProductPicker products={products} fill={{ reason: 'label' }} hint="Optional: puts the product name in the reason." />
            <FormGrid>
              <SelectInput label="Currency" name="currency" options={[{ value: 'points', label: 'Reward points' }, { value: 'tokens', label: 'Reward tokens' }]} />
              <SelectInput label="Type" name="direction" options={[{ value: 'credit', label: 'Credit (assign)' }, { value: 'debit', label: 'Debit (deduct)' }]} />
              <TextInput label="Amount per contractor" name="amount" type="number" min={1} required />
              <TextInput label="Reason" name="reason" required minLength={5} placeholder="e.g. Diwali bonus" />
            </FormGrid>
          </ActionForm>
        )}
      </Panel>

      <Panel title="Ledger" description="Latest 100 transactions across all contractors. Reversals post compensating entries rather than deleting history.">
        {txns.length === 0 ? (
          <EmptyState title="No transactions yet" />
        ) : (
          <DataTable head={['Txn', 'Date', 'Contractor', 'Currency', 'Type', 'Amount', 'Balance after', 'Reason', 'By']}>
            {txns.map((t) => (
              <tr key={t.id}>
                <Td className="font-mono text-xs">{t.txn_code ?? `#${t.id}`}</Td>
                <Td>{fmtDate(t.created_at)}</Td>
                <Td>
                  <Link href={`/admin/contractors/${t.contractor_id}`} className="hover:text-brand">
                    {t.contractor_name}
                  </Link>
                </Td>
                <Td className="capitalize">{t.currency}</Td>
                <Td className="capitalize">{t.entry_type.replace(/_/g, ' ')}</Td>
                <Td className="tabular-nums">{fmtNumber(t.amount)}</Td>
                <Td className="tabular-nums">{fmtNumber(t.available_after)}</Td>
                <Td className="text-xs text-ink-muted">{t.reason ?? '\u2014'}</Td>
                <Td className="text-xs capitalize">{t.created_by_type}</Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
    </>
  )
}
