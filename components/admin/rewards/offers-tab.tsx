import { listOffers } from '@/lib/server/admin-rewards'
import { ActionForm } from '@/components/admin/action-form'
import { FormDialog } from '@/components/admin/form-dialog'
import { CheckboxInput, FormGrid, SelectInput, TextArea, TextInput } from '@/components/admin/fields'
import { DataTable, EmptyState, fmtDate, fmtNumber, Panel, StatusBadge, Td, toInputDate } from '@/components/admin/ui'
import { saveOfferAction } from '@/app/admin/(panel)/panel-actions'

type Offer = Awaited<ReturnType<typeof listOffers>>[number]

function OfferFields({ o }: { o?: Offer }) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <>
      <FormGrid>
        <TextInput label="Offer title" name="title" required defaultValue={o?.title} className="sm:col-span-2" />
        <TextInput label="Banner image URL" name="bannerUrl" defaultValue={o?.banner_url ?? ''} placeholder="https://..." className="sm:col-span-2" />
        <TextInput label="Start date" name="startDate" type="date" required defaultValue={toInputDate(o?.start_date) || today} />
        <TextInput label="End date" name="endDate" type="date" required defaultValue={toInputDate(o?.end_date)} />
        <SelectInput
          label="Reward type"
          name="rewardType"
          defaultValue={o?.reward_type ?? 'gift'}
          options={['points', 'tokens', 'gift', 'multiplier', 'info'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))}
        />
        <TextInput label="Reward value" name="rewardValue" type="number" min={0} defaultValue={o?.reward_value ?? ''} />
        <TextInput label="Target value" name="targetValue" type="number" min={0} step="any" defaultValue={o?.target_value ?? ''} />
        <SelectInput
          label="Target measured in"
          name="targetUnit"
          defaultValue={o?.target_unit ?? ''}
          options={[
            { value: '', label: 'No target' },
            { value: 'tokens', label: 'Tokens' },
            { value: 'points', label: 'Points' },
            { value: 'amount', label: 'Sales amount' },
            { value: 'quantity', label: 'Quantity' },
          ]}
        />
        <SelectInput label="Eligibility" name="audience" defaultValue={o?.audience ?? 'all'} options={[{ value: 'all', label: 'All active contractors' }, { value: 'specific', label: 'Specific contractors' }]} />
        <TextInput label="Contractor IDs (if specific)" name="contractorIds" defaultValue={o?.audience_ids ?? ''} placeholder="e.g. 3, 7, 12" />
        <SelectInput
          label="Status"
          name="status"
          defaultValue={o?.status ?? 'draft'}
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
            { value: 'archived', label: 'Archived' },
          ]}
        />
        <TextArea label="Description" name="description" defaultValue={o?.description ?? ''} className="sm:col-span-2" />
        <TextArea label="Terms & conditions" name="terms" defaultValue={o?.terms ?? ''} className="sm:col-span-2" />
      </FormGrid>
      <div className="flex flex-wrap gap-4">
        <CheckboxInput label="Show progress to contractor" name="showProgress" defaultChecked={o ? Boolean(Number(o.show_progress)) : true} />
        <CheckboxInput label="Featured campaign" name="isFeatured" defaultChecked={o ? Boolean(Number(o.is_featured)) : false} />
      </div>
    </>
  )
}

function phase(o: Offer) {
  const today = new Date().toISOString().slice(0, 10)
  const s = toInputDate(o.start_date)
  const e = toInputDate(o.end_date)
  if (o.status !== 'published') return o.status
  if (today < s) return 'upcoming'
  if (today > e) return 'expired'
  return 'active'
}

export async function OffersTab() {
  const offers = await listOffers()
  return (
    <Panel
      title="Offers & schemes"
      description="Published offers appear in the contractor app. Progress is calculated from real qualifying reward data."
      actions={
        <FormDialog triggerLabel="Create offer" title="Create offer">
          <ActionForm action={saveOfferAction} submitLabel="Save offer">
            <OfferFields />
          </ActionForm>
        </FormDialog>
      }
    >
      {offers.length === 0 ? (
        <EmptyState title="No offers yet" description="Example: Motorcycle reward with a 100-token target." />
      ) : (
        <DataTable head={['Offer', 'Dates', 'Target', 'Reward', 'Audience', 'Status', 'Actions']}>
          {offers.map((o) => (
            <tr key={o.id}>
              <Td>
                <p className="font-medium">{o.title}</p>
                <p className="font-mono text-xs text-ink-muted">
                  {o.offer_code}
                  {Number(o.is_featured) ? ' \u00B7 Featured' : ''}
                </p>
              </Td>
              <Td className="text-xs">
                {fmtDate(o.start_date)} &ndash; {fmtDate(o.end_date)}
              </Td>
              <Td className="text-xs">{o.target_value ? `${fmtNumber(o.target_value)} ${o.target_unit ?? ''}` : '\u2014'}</Td>
              <Td className="text-xs capitalize">{o.reward_value ? `${fmtNumber(o.reward_value)} ${o.reward_type}` : o.reward_type}</Td>
              <Td className="text-xs">{o.audience === 'all' ? 'All' : `${o.audience_ids?.split(',').length ?? 0} contractor(s)`}</Td>
              <Td>
                <StatusBadge status={phase(o)} />
              </Td>
              <Td>
                <FormDialog triggerLabel="Edit" title={`Edit ${o.title}`} variant="edit">
                  <ActionForm action={saveOfferAction} submitLabel="Save offer">
                    <input type="hidden" name="id" value={o.id} />
                    <OfferFields o={o} />
                  </ActionForm>
                </FormDialog>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </Panel>
  )
}
