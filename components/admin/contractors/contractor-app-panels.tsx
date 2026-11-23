import { listAccountEntries, listTargets, type AccountEntryRow, type TargetRow } from '@/lib/server/catalogue-admin'
import { ActionForm } from '@/components/admin/action-form'
import { DeleteRecordButton } from '@/components/admin/confirm-action-button'
import { FormDialog } from '@/components/admin/form-dialog'
import { FormGrid, SelectInput, TextInput } from '@/components/admin/fields'
import { DataTable, EmptyState, fmtCurrency, fmtDate, fmtNumber, Panel, StatusBadge, Td } from '@/components/admin/ui'
import { saveAccountEntryAction, saveTargetAction } from '@/app/admin/(panel)/panel-actions'

const TARGET_UNITS = [
  { value: 'amount', label: 'Sales amount (₹)' },
  { value: 'points', label: 'Points' },
  { value: 'tokens', label: 'Tokens' },
  { value: 'quantity', label: 'Quantity' },
]

const TARGET_STATUSES = [
  { value: 'in_progress', label: 'In progress (shown in app)' },
  { value: 'achieved', label: 'Achieved' },
  { value: 'expired', label: 'Expired' },
]

const ENTRY_TYPES = [
  { value: 'credit', label: 'Credit (payment received)' },
  { value: 'debit', label: 'Debit (purchase)' },
  { value: 'udhar', label: 'Udhar (credit taken)' },
  { value: 'advance', label: 'Advance' },
  { value: 'opening', label: 'Opening balance' },
]

function TargetFields({ contractorId, t }: { contractorId: number; t?: TargetRow }) {
  return (
    <>
      <input type="hidden" name="contractorId" value={contractorId} />
      {t ? <input type="hidden" name="id" value={t.id} /> : null}
      <FormGrid>
        <TextInput label="Title" name="title" required defaultValue={t?.title} placeholder="e.g. Monthly Sales Target" className="sm:col-span-2" />
        <TextInput label="Target value" name="targetValue" type="number" min={1} step="any" required defaultValue={t ? Number(t.target_value) : undefined} />
        <TextInput label="Current progress" name="currentValue" type="number" min={0} step="any" defaultValue={t ? Number(t.current_value) : 0} />
        <SelectInput label="Unit" name="unit" defaultValue={t?.unit ?? 'amount'} options={TARGET_UNITS} />
        <SelectInput label="Status" name="status" defaultValue={t?.status ?? 'in_progress'} options={TARGET_STATUSES} />
      </FormGrid>
    </>
  )
}

function EntryFields({ contractorId, e }: { contractorId: number; e?: AccountEntryRow }) {
  return (
    <>
      <input type="hidden" name="contractorId" value={contractorId} />
      {e ? <input type="hidden" name="id" value={e.id} /> : null}
      <FormGrid>
        <SelectInput label="Type" name="entryType" defaultValue={e?.entry_type ?? 'credit'} options={ENTRY_TYPES} />
        <TextInput label="Amount (₹)" name="amount" type="number" min={1} step="0.01" required defaultValue={e ? Number(e.amount) : undefined} />
        <TextInput label="Description" name="description" required defaultValue={e?.description} placeholder="e.g. Payment received – UPI" className="sm:col-span-2" />
        <TextInput label="Reference (optional)" name="reference" defaultValue={e?.reference ?? ''} />
        <TextInput
          label="Date"
          name="entryDate"
          type="date"
          required
          defaultValue={e ? String(e.entry_date).slice(0, 10) : new Date().toISOString().slice(0, 10)}
        />
      </FormGrid>
    </>
  )
}

/** Admin controls for the contractor app's "Offers & Schemes" targets and "My Ledger" (Udhar/Advance) screens. */
export async function ContractorAppPanels({ contractorId }: { contractorId: number }) {
  const [targets, entries] = await Promise.all([listTargets(contractorId), listAccountEntries(contractorId)])

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Panel
        title="Targets"
        description="In-progress targets appear under Offers & Schemes in the contractor app."
        actions={
          <FormDialog triggerLabel="Add target" title="Add target">
            <ActionForm action={saveTargetAction} submitLabel="Add target">
              <TargetFields contractorId={contractorId} />
            </ActionForm>
          </FormDialog>
        }
      >
        {targets.length === 0 ? (
          <EmptyState title="No targets yet" />
        ) : (
          <DataTable head={['Title', 'Progress', 'Status', '']}>
            {targets.map((t) => (
              <tr key={t.id}>
                <Td className="font-medium text-ink">{t.title}</Td>
                <Td className="tabular-nums">
                  {t.unit === 'amount'
                    ? `${fmtCurrency(t.current_value)} / ${fmtCurrency(t.target_value)}`
                    : `${fmtNumber(t.current_value)} / ${fmtNumber(t.target_value)} ${t.unit}`}
                </Td>
                <Td>
                  <StatusBadge status={t.status} />
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <FormDialog triggerLabel="Edit" title={`Edit ${t.title}`} variant="edit">
                      <ActionForm action={saveTargetAction} submitLabel="Save changes">
                        <TargetFields contractorId={contractorId} t={t} />
                      </ActionForm>
                    </FormDialog>
                    <DeleteRecordButton entity="target" id={t.id} name={t.title} label="target" />
                  </div>
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>

      <Panel
        title="Account ledger (Udhar / Advance)"
        description="Shown to the contractor under My Ledger. Use an Opening balance entry to set the starting amount."
        actions={
          <FormDialog triggerLabel="Add entry" title="Add ledger entry">
            <ActionForm action={saveAccountEntryAction} submitLabel="Add entry">
              <EntryFields contractorId={contractorId} />
            </ActionForm>
          </FormDialog>
        }
      >
        {entries.length === 0 ? (
          <EmptyState title="No ledger entries yet" />
        ) : (
          <DataTable head={['Date', 'Type', 'Amount', 'Description', '']}>
            {entries.map((e) => (
              <tr key={e.id}>
                <Td>{fmtDate(e.entry_date)}</Td>
                <Td className="capitalize">{e.entry_type}</Td>
                <Td className="tabular-nums">{fmtCurrency(e.amount)}</Td>
                <Td className="text-ink-muted">
                  {e.description}
                  {e.reference ? ` · ${e.reference}` : ''}
                </Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <FormDialog triggerLabel="Edit" title="Edit ledger entry" variant="edit">
                      <ActionForm action={saveAccountEntryAction} submitLabel="Save changes">
                        <EntryFields contractorId={contractorId} e={e} />
                      </ActionForm>
                    </FormDialog>
                    <DeleteRecordButton entity="account_entry" id={e.id} name={e.description} label="ledger entry" />
                  </div>
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
    </div>
  )
}
