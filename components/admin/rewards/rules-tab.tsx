import { listRules, RULE_TYPES, type RuleRow } from '@/lib/server/rewards-engine'
import { listContractorOptions, listGifts } from '@/lib/server/admin-rewards'
import { ActionForm } from '@/components/admin/action-form'
import { FormDialog } from '@/components/admin/form-dialog'
import { DeleteRecordButton } from '@/components/admin/confirm-action-button'
import { CheckboxInput, FormGrid, SelectInput, TextArea, TextInput } from '@/components/admin/fields'
import { DataTable, EmptyState, fmtDate, fmtNumber, Panel, StatusBadge, Td, toInputDate } from '@/components/admin/ui'
import { ruleStatusAction, saveRuleAction } from '@/app/admin/(panel)/panel-actions'

type Option = { value: string | number; label: string }

function Section({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="rounded-lg border border-border p-4 [&_summary]:cursor-pointer">
      <summary className="text-sm font-semibold text-ink">{title}</summary>
      <div className="mt-4">{children}</div>
    </details>
  )
}

function RuleFields({ r, contractors, gifts, duplicate }: { r?: RuleRow; contractors: Option[]; gifts: Option[]; duplicate?: boolean }) {
  const v = (x: number | string | null | undefined) => (x == null ? '' : String(x))
  return (
    <div className="flex flex-col gap-3">
      <Section title="Basics" open>
        <FormGrid>
          <TextInput label="Rule name" name="name" required defaultValue={duplicate ? `${r?.name} (copy)` : r?.name} />
          <SelectInput label="Rule type" name="ruleType" defaultValue={r?.rule_type} options={RULE_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
          <TextArea label="Description" name="description" className="sm:col-span-2" defaultValue={r?.description ?? ''} />
        </FormGrid>
      </Section>
      <Section title="Conditions">
        <FormGrid>
          <TextInput label="Product category" name="productCategory" defaultValue={r?.product_category ?? ''} />
          <TextInput label="Brand" name="brand" defaultValue={r?.brand ?? ''} />
          <TextInput label="Product reference" name="productRef" defaultValue={r?.product_ref ?? ''} />
          <SelectInput label="Eligible contractor" name="contractorId" defaultValue={v(r?.contractor_id)} options={[{ value: '', label: 'All contractors' }, ...contractors]} />
          <TextInput label="Minimum quantity" name="minQuantity" type="number" min={0} step="any" defaultValue={v(r?.min_quantity)} />
          <TextInput label="Minimum amount (Rs.)" name="minAmount" type="number" min={0} step="any" defaultValue={v(r?.min_amount)} />
          <TextInput label="Unit size (per N units)" name="unitSize" type="number" min={0} step="any" defaultValue={v(r?.unit_size)} hint="e.g. 10 for 10 glue bags" />
          <TextInput label="Target threshold" name="targetThreshold" type="number" min={0} step="any" defaultValue={v(r?.target_threshold)} />
        </FormGrid>
      </Section>
      <Section title="Reward" open>
        <FormGrid>
          <TextInput label="Reward points" name="rewardPoints" type="number" min={0} required defaultValue={v(r?.reward_points ?? 0)} />
          <TextInput label="Reward tokens" name="rewardTokens" type="number" min={0} required defaultValue={v(r?.reward_tokens ?? 0)} />
          <SelectInput label="Gift eligibility" name="giftId" defaultValue={v(r?.gift_id)} options={[{ value: '', label: 'None' }, ...gifts]} />
          <TextInput label="Maximum reward cap" name="maxRewardCap" type="number" min={1} defaultValue={v(r?.max_reward_cap)} />
        </FormGrid>
      </Section>
      <Section title="Validity, priority & status" open>
        <FormGrid>
          <TextInput label="Valid from" name="validFrom" type="date" defaultValue={toInputDate(r?.valid_from)} />
          <TextInput label="Valid until" name="validUntil" type="date" defaultValue={toInputDate(r?.valid_until)} />
          <TextInput label="Priority (lower runs first)" name="priority" type="number" min={0} defaultValue={v(r?.priority ?? 100)} />
          <SelectInput
            label="Status"
            name="status"
            defaultValue={duplicate ? 'draft' : r?.status === 'archived' ? 'inactive' : r?.status ?? 'draft'}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
          <CheckboxInput label="Repeatable" name="isRepeatable" defaultChecked={r ? Boolean(Number(r.is_repeatable)) : true} />
          <CheckboxInput label="Stackable with other rules" name="isStackable" defaultChecked={r ? Boolean(Number(r.is_stackable)) : false} />
        </FormGrid>
      </Section>
    </div>
  )
}

function describe(r: RuleRow) {
  const cond = [
    r.min_quantity ? `${fmtNumber(r.min_quantity)}+ qty` : null,
    r.unit_size ? `per ${fmtNumber(r.unit_size)} units` : null,
    r.min_amount ? `Rs.${fmtNumber(r.min_amount)}+` : null,
    r.target_threshold ? `target ${fmtNumber(r.target_threshold)}` : null,
    r.brand,
    r.product_category,
  ].filter(Boolean)
  return cond.join(' \u00B7 ') || 'Any eligible activity'
}

export async function RulesTab() {
  const [rules, contractors, gifts] = await Promise.all([listRules(), listContractorOptions(), listGifts()])
  const cOpts = contractors.map((c) => ({ value: c.id, label: `${c.name} (${c.contractor_code})` }))
  const gOpts = gifts.map((g) => ({ value: g.id, label: g.name }))

  return (
    <Panel
      title="Reward rules"
      description="Edits create a new version; rewards already posted are never rewritten."
      actions={
        <FormDialog triggerLabel="Create rule" title="Create reward rule">
          <ActionForm action={saveRuleAction} submitLabel="Save rule">
            <RuleFields contractors={cOpts} gifts={gOpts} />
          </ActionForm>
        </FormDialog>
      }
    >
      {rules.length === 0 ? (
        <EmptyState title="No reward rules yet" description="Example: 10 glue bags = 120 points, or Rs.50,000 eligible tiles = 500 points." />
      ) : (
        <DataTable head={['Rule', 'Type', 'Conditions', 'Reward', 'Validity', 'Priority', 'Applied', 'Status', 'Actions']}>
          {rules.map((r) => (
            <tr key={r.id}>
              <Td>
                <p className="font-medium">{r.name}</p>
                <p className="font-mono text-xs text-ink-muted">
                  {r.rule_code} v{r.version}
                </p>
              </Td>
              <Td className="text-xs">{RULE_TYPES.find((t) => t.value === r.rule_type)?.label}</Td>
              <Td className="text-xs text-ink-muted">
                {describe(r)}
                {r.contractor_name ? <span className="block">Only: {r.contractor_name}</span> : null}
              </Td>
              <Td className="text-xs tabular-nums">
                {fmtNumber(r.reward_points)} pts / {fmtNumber(r.reward_tokens)} tokens
                {r.gift_name ? <span className="block">Gift: {r.gift_name}</span> : null}
              </Td>
              <Td className="text-xs">
                {fmtDate(r.valid_from)} &ndash; {fmtDate(r.valid_until)}
              </Td>
              <Td className="tabular-nums">{r.priority}</Td>
              <Td className="tabular-nums">{fmtNumber(r.times_applied)}</Td>
              <Td>
                <StatusBadge status={r.status} />
              </Td>
              <Td>
                <div className="flex flex-wrap gap-1.5">
                  <FormDialog triggerLabel="Edit" title={`Edit ${r.name}`} variant="edit">
                    <ActionForm action={saveRuleAction} submitLabel="Save new version">
                      <input type="hidden" name="id" value={r.id} />
                      <RuleFields r={r} contractors={cOpts} gifts={gOpts} />
                    </ActionForm>
                  </FormDialog>
                  <FormDialog triggerLabel="Duplicate" title={`Duplicate ${r.name}`} variant="edit">
                    <ActionForm action={saveRuleAction} submitLabel="Create copy">
                      <RuleFields r={r} contractors={cOpts} gifts={gOpts} duplicate />
                    </ActionForm>
                  </FormDialog>
                  {(r.status === 'active' ? ['inactive', 'archived'] : ['active', 'archived']).map((s) => (
                    <ActionForm key={s} action={ruleStatusAction} submitLabel={s === 'active' ? 'Activate' : s === 'inactive' ? 'Deactivate' : 'Archive'} submitVariant="outline" inline>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="status" value={s} />
                    </ActionForm>
                  ))}
                  <DeleteRecordButton entity="rule" id={r.id} name={r.name} label="rule" />
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </Panel>
  )
}
