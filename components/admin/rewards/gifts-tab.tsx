import { listGifts, type GiftRow } from '@/lib/server/admin-rewards'
import { ActionForm } from '@/components/admin/action-form'
import { FormDialog } from '@/components/admin/form-dialog'
import { CheckboxInput, FormGrid, TextArea, TextInput } from '@/components/admin/fields'
import { DataTable, EmptyState, fmtNumber, Panel, StatusBadge, Td } from '@/components/admin/ui'
import { archiveGiftAction, saveGiftAction } from '@/app/admin/(panel)/panel-actions'

function GiftFields({ g }: { g?: GiftRow }) {
  return (
    <>
      <FormGrid>
        <TextInput label="Gift name" name="name" required defaultValue={g?.name} />
        <TextInput label="Category" name="category" defaultValue={g?.category ?? ''} placeholder="Tools, Electronics, Vehicle" />
        <TextInput label="Image URL" name="imageUrl" defaultValue={g?.image_url ?? ''} placeholder="https://... or /images/gift.png" className="sm:col-span-2" />
        <TextInput label="Required points" name="requiredPoints" type="number" min={0} required defaultValue={g?.required_points ?? 0} />
        <TextInput label="Required tokens" name="requiredTokens" type="number" min={0} required defaultValue={g?.required_tokens ?? 0} />
        <TextInput label="Available quantity" name="stock" type="number" min={0} required defaultValue={g?.total_quantity ?? 0} />
        <TextInput label="Display order" name="displayOrder" type="number" min={0} defaultValue={g?.display_order ?? 0} />
        <TextInput label="Eligibility criteria" name="eligibilityNote" defaultValue={g?.eligibility_note ?? ''} className="sm:col-span-2" />
        <TextArea label="Description" name="description" defaultValue={g?.description ?? ''} className="sm:col-span-2" />
        <TextArea label="Terms & conditions" name="terms" defaultValue={g?.terms ?? ''} className="sm:col-span-2" />
      </FormGrid>
      <div className="flex flex-wrap gap-4">
        <CheckboxInput label="Visible in app" name="isVisible" defaultChecked={g ? Boolean(Number(g.is_visible)) : true} />
        <CheckboxInput label="Redemption enabled" name="redemptionEnabled" defaultChecked={g ? Boolean(Number(g.redemption_enabled)) : true} />
        <CheckboxInput label="Featured" name="isFeatured" defaultChecked={g ? Boolean(Number(g.is_featured)) : false} />
      </div>
    </>
  )
}

export async function GiftsTab() {
  const gifts = await listGifts()
  return (
    <Panel
      title="Gift catalogue"
      description="Controls the Gift Catalogue and Claim Reward screens in the contractor app."
      actions={
        <FormDialog triggerLabel="Add gift" title="Add gift">
          <ActionForm action={saveGiftAction} submitLabel="Save gift">
            <GiftFields />
          </ActionForm>
        </FormDialog>
      }
    >
      {gifts.length === 0 ? (
        <EmptyState title="No gifts yet" description="Add gifts like Glue Mixer, Mobile Phone, LED TV, or Motorcycle." />
      ) : (
        <DataTable head={['Order', 'Gift', 'Requirement', 'Stock', 'Flags', 'Status', 'Actions']}>
          {gifts.map((g) => {
            const free = Number(g.total_quantity) - Number(g.reserved_quantity) - Number(g.issued_quantity)
            return (
              <tr key={g.id}>
                <Td className="tabular-nums">{g.display_order}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    {g.image_url ? <img src={g.image_url} alt="" className="size-10 rounded-md border border-border object-cover" /> : null}
                    <div>
                      <p className="font-medium">{g.name}</p>
                      <p className="font-mono text-xs text-ink-muted">
                        {g.gift_code} {g.category ? `\u00B7 ${g.category}` : ''}
                      </p>
                    </div>
                  </div>
                </Td>
                <Td className="text-xs tabular-nums">
                  {fmtNumber(g.required_points)} pts / {fmtNumber(g.required_tokens)} tokens
                </Td>
                <Td className="text-xs tabular-nums">
                  {fmtNumber(free)} free
                  <span className="block text-ink-muted">
                    {fmtNumber(g.reserved_quantity)} reserved &middot; {fmtNumber(g.issued_quantity)} issued
                  </span>
                </Td>
                <Td className="text-xs">
                  {[Number(g.is_visible) ? 'Visible' : 'Hidden', Number(g.redemption_enabled) ? 'Claimable' : 'Claims off', Number(g.is_featured) ? 'Featured' : null]
                    .filter(Boolean)
                    .join(' \u00B7 ')}
                </Td>
                <Td>
                  <StatusBadge status={g.status} />
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <FormDialog triggerLabel="Edit" title={`Edit ${g.name}`} variant="edit">
                      <ActionForm action={saveGiftAction} submitLabel="Save gift">
                        <input type="hidden" name="id" value={g.id} />
                        <GiftFields g={g} />
                      </ActionForm>
                    </FormDialog>
                    <ActionForm action={archiveGiftAction} submitLabel="Archive" submitVariant="outline" inline>
                      <input type="hidden" name="id" value={g.id} />
                    </ActionForm>
                  </div>
                </Td>
              </tr>
            )
          })}
        </DataTable>
      )}
    </Panel>
  )
}
