import { listOffers } from '@/lib/server/admin-rewards'
import { ActionForm } from '@/components/admin/action-form'
import { FormDialog } from '@/components/admin/form-dialog'
import { DeleteRecordButton } from '@/components/admin/confirm-action-button'
import { ImageUploadField } from '@/components/admin/image-upload-field'
import { CheckboxInput, FormGrid, SelectInput, TextArea, TextInput } from '@/components/admin/fields'
import { DataTable, EmptyState, fmtDate, fmtNumber, Panel, StatusBadge, Td, toInputDate } from '@/components/admin/ui'
import { offerStatusAction, saveOfferAction } from '@/app/admin/(panel)/panel-actions'

type Offer = Awaited<ReturnType<typeof listOffers>>[number]

function OfferFields({ o }: { o?: Offer }) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <>
      <FormGrid>
        <TextInput label="Offer title" name="title" required defaultValue={o?.title} className="sm:col-span-2" />
        <ImageUploadField label="Banner image" name="bannerUrl" fileName="bannerFile" defaultValue={o?.banner_url} aspect="banner" className="sm:col-span-2" />
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
          defaultValue={o?.status ?? 'published'}
          hint="Only Published offers are shown in the contractor app."
          options={[
            { value: 'published', label: 'Published (visible to contractors)' },
            { value: 'draft', label: 'Draft (hidden)' },
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
      description="Only Published offers appear in the contractor app, from their start date until the end date. Drafts stay hidden."
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
                {o.status === 'draft' ? <p className="mt-1 text-xs text-ink-muted">Hidden from contractors</p> : null}
                {phase(o) === 'expired' ? <p className="mt-1 text-xs text-ink-muted">Past end date, hidden</p> : null}
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  {o.status !== 'archived' ? (
                    <ActionForm
                      action={offerStatusAction}
                      submitLabel={o.status === 'published' ? 'Unpublish' : 'Publish'}
                      submitVariant={o.status === 'published' ? 'outline' : 'default'}
                      inline
                    >
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="status" value={o.status === 'published' ? 'draft' : 'published'} />
                    </ActionForm>
                  ) : null}
                  <FormDialog triggerLabel="Edit" title={`Edit ${o.title}`} variant="edit">
                    <ActionForm action={saveOfferAction} submitLabel="Save offer">
                      <input type="hidden" name="id" value={o.id} />
                      <OfferFields o={o} />
                    </ActionForm>
                  </FormDialog>
                  <DeleteRecordButton entity="offer" id={o.id} name={o.title} label="offer" />
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </Panel>
  )
}
