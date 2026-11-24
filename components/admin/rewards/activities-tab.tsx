import Link from 'next/link'
import { listActivities } from '@/lib/server/rewards-engine'
import { listContractorOptions } from '@/lib/server/admin-rewards'
import { listProductOptions } from '@/lib/server/catalogue-admin'
import { ProductPicker } from '@/components/admin/product-picker'
import { ActionForm } from '@/components/admin/action-form'
import { FormDialog } from '@/components/admin/form-dialog'
import { DeleteRecordButton } from '@/components/admin/confirm-action-button'
import { CheckboxInput, FormGrid, SelectInput, TextArea, TextInput } from '@/components/admin/fields'
import { DataTable, EmptyState, fmtCurrency, fmtDate, fmtNumber, Panel, StatusBadge, Td } from '@/components/admin/ui'
import { activityDecisionAction, createActivityAction } from '@/app/admin/(panel)/panel-actions'
import { cn } from '@/lib/utils'

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'reversed', label: 'Reversed' },
]

export async function ActivitiesTab({ status = '', q = '' }: { status?: string; q?: string }) {
  const [rows, contractors, products] = await Promise.all([
    listActivities({ status: status || undefined, q: q.trim() || undefined }),
    listContractorOptions(),
    listProductOptions(),
  ])
  const today = new Date().toISOString().slice(0, 10)

  return (
    <Panel
      title="Sales"
      description="Each sale shows on the contractor's My Sales screen. Enter reward points yourself, or leave them blank to use the reward rules."
      actions={
        <FormDialog triggerLabel="Add sale" title="Add referred sale">
          {contractors.length === 0 ? (
            <EmptyState title="No contractors" description="Add a contractor first." />
          ) : (
            <ActionForm action={createActivityAction} submitLabel="Save sale">
              <ProductPicker
                products={products}
                fill={{ productRef: 'name', productCategory: 'category', brand: 'brand', unit: 'unit', notes: 'description' }}
                points={{ field: 'manualPoints', quantityField: 'quantity' }}
              />
              <FormGrid>
                <SelectInput label="Contractor" name="contractorId" required options={contractors.map((c) => ({ value: c.id, label: `${c.name} (${c.mobile})` }))} />
                <TextInput label="Referred customer name" name="customerName" placeholder="Who bought the material" />
                <TextInput label="Invoice / reference number" name="referenceNumber" required />
                <TextInput label="Sale date" name="activityDate" type="date" required defaultValue={today} max={today} />
                <TextInput label="Product category" name="productCategory" placeholder="Tiles, Glue, Sanitary..." />
                <TextInput label="Brand" name="brand" />
                <TextInput label="Product name" name="productRef" placeholder="e.g. Vitrified Tile 600x600" />
                <TextInput label="Quantity" name="quantity" type="number" min={0} step="any" required defaultValue={0} />
                <TextInput label="Unit" name="unit" placeholder="bags, boxes, sq ft" />
                <TextInput label="Purchase amount (₹)" name="eligibleAmount" type="number" min={0} step="any" required defaultValue={0} />
                <TextInput
                  label="Reward points"
                  name="manualPoints"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Blank = use reward rules"
                  hint="Points the contractor gets for this sale once approved."
                />
                <TextArea label="Product description" name="notes" className="sm:col-span-2" placeholder="Shown to the contractor in My Sales" />
              </FormGrid>
              <CheckboxInput label="Approve now and credit points" name="approveNow" defaultChecked />
            </ActionForm>
          )}
        </FormDialog>
      }
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filter activities" className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/admin/rewards-engine/activities${f.value ? `?status=${f.value}` : ''}`}
              aria-current={status === f.value ? 'page' : undefined}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', status === f.value ? 'bg-brand text-white' : 'text-ink-muted hover:bg-app-bg hover:text-ink')}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" action="/admin/rewards-engine/activities">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <label htmlFor="activity-q" className="sr-only">
            Search activities
          </label>
          <input id="activity-q" name="q" defaultValue={q} placeholder="Reference, contractor, mobile" className="h-9 w-64 rounded-lg border border-border px-3 text-sm outline-none focus:border-brand" />
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No sales found" />
      ) : (
        <DataTable head={['Date', 'Contractor', 'Reference', 'Product', 'Qty', 'Amount', 'Rewards', 'Status', 'Actions']}>
          {rows.map((a) => (
            <tr key={a.id}>
              <Td>{fmtDate(a.activity_date)}</Td>
              <Td>
                <Link href={`/admin/contractors/${a.contractor_id}`} className="font-medium hover:text-brand">
                  {a.contractor_name}
                </Link>
                {a.customer_name ? <p className="text-xs text-ink-muted">{a.customer_name}</p> : null}
              </Td>
              <Td className="font-mono text-xs">{a.reference_number}</Td>
              <Td className="text-xs">
                {[a.product_category, a.brand, a.product_ref].filter(Boolean).join(' / ') || '\u2014'}
                {a.notes ? <p className="mt-0.5 line-clamp-2 text-ink-muted">{a.notes}</p> : null}
              </Td>
              <Td className="tabular-nums">{fmtNumber(a.quantity)}</Td>
              <Td className="tabular-nums">{fmtCurrency(a.eligible_amount)}</Td>
              <Td className="text-xs tabular-nums">
                {a.status === 'submitted' ? (
                  a.manual_points !== null ? `${fmtNumber(a.manual_points)} pts (on approval)` : 'By rules (on approval)'
                ) : (
                  <>
                    {fmtNumber(a.points)} pts / {fmtNumber(a.tokens)} tok
                  </>
                )}
              </Td>
              <Td>
                <StatusBadge status={a.status} />
                {a.rejection_reason ? <p className="mt-1 text-xs text-ink-muted">{a.rejection_reason}</p> : null}
              </Td>
              <Td>
                {a.status === 'submitted' ? (
                  <div className="flex flex-col gap-2">
                    <ActionForm action={activityDecisionAction} submitLabel="Approve" inline>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="decision" value="approve" />
                    </ActionForm>
                    <ActionForm action={activityDecisionAction} submitLabel="Reject" submitVariant="destructive" inline>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <input name="reason" aria-label="Rejection reason" placeholder="Reason" required minLength={3} className="h-10 w-32 rounded-lg border border-border px-2 text-sm" />
                    </ActionForm>
                    <DeleteRecordButton entity="activity" id={a.id} name={a.reference_number ?? `Activity #${a.id}`} label="activity" />
                  </div>
                ) : a.status === 'approved' ? (
                  <ActionForm action={activityDecisionAction} submitLabel="Reverse" submitVariant="outline" inline>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="decision" value="reverse" />
                    <input name="reason" aria-label="Reversal reason" placeholder="Reason" required minLength={3} className="h-10 w-32 rounded-lg border border-border px-2 text-sm" />
                  </ActionForm>
                ) : (
                  <DeleteRecordButton entity="activity" id={a.id} name={a.reference_number ?? `Activity #${a.id}`} label="activity" />
                )}
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </Panel>
  )
}
