import { getAppContent } from '@/lib/server/admin-rewards'
import { ActionForm } from '@/components/admin/action-form'
import { CheckboxInput, FormGrid, SelectInput, TextInput } from '@/components/admin/fields'
import { Panel } from '@/components/admin/ui'
import { saveAppContentAction } from '@/app/admin/(panel)/panel-actions'
import { LogoUploadField } from './logo-upload-field'

const CONTENT_FIELDS = ['brandName', 'logoUrl', 'storePhone', 'welcomeText', 'rewardCardTitle', 'redeemButtonText', 'supportMessage', 'ledgerMessage'] as const
const CONFIG_FIELDS = ['pointsLabel', 'tokensLabel', 'activityApprovalMode'] as const

/** Both tabs save the same configuration record, so fields from the other tab are carried as hidden inputs. */
export async function AppContentTab({ section }: { section: 'content' | 'configuration' }) {
  const c = await getAppContent()
  const hidden = section === 'content' ? CONFIG_FIELDS : CONTENT_FIELDS

  return (
    <Panel
      title={section === 'content' ? 'Contractor app content' : 'Rewards configuration'}
      description={
        section === 'content'
          ? 'Changes the text and tile visibility in the contractor app. The original layout and 3x2 grid stay the same.'
          : 'Currency names shown to contractors and how new sales are approved.'
      }
    >
      <ActionForm action={saveAppContentAction} submitLabel="Save changes">
        {hidden.map((k) => (
          <input key={k} type="hidden" name={k} value={String(c[k])} />
        ))}

        {section === 'content' ? (
          <>
            <h3 className="text-sm font-semibold text-ink">Branding & welcome</h3>
            <FormGrid>
              <LogoUploadField defaultValue={c.logoUrl} />
              <TextInput label="App display name" name="brandName" required defaultValue={c.brandName} />
              <TextInput label="Welcome message" name="welcomeText" defaultValue={c.welcomeText} />
              <TextInput label="Store phone (Call / WhatsApp)" name="storePhone" type="tel" defaultValue={c.storePhone} placeholder="+91 98765 43210" />
              <TextInput label="Support contact message" name="supportMessage" defaultValue={c.supportMessage} className="sm:col-span-2" />
            </FormGrid>

            <h3 className="text-sm font-semibold text-ink">Reward card</h3>
            <FormGrid>
              <TextInput label="Card title" name="rewardCardTitle" required defaultValue={c.rewardCardTitle} />
              <TextInput label="Redeem button text" name="redeemButtonText" required defaultValue={c.redeemButtonText} />
            </FormGrid>

            <h3 className="text-sm font-semibold text-ink">Quick action tiles</h3>
            <div className="flex flex-col gap-3">
              {c.quickActions.map((q) => (
                <div key={q.key} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <TextInput label={`${q.key} label`} name={`qa_${q.key}_title`} required defaultValue={q.title} />
                  <TextInput label="Subtitle" name={`qa_${q.key}_subtitle`} defaultValue={q.subtitle} />
                  <div className="pb-2.5">
                    <CheckboxInput label="Visible" name={`qa_${q.key}_visible`} defaultChecked={q.visible} />
                  </div>
                </div>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-ink">My Ledger (Udhar/Advance)</h3>
            <p className="text-xs text-ink-muted">Entries are managed per contractor on the contractor&apos;s detail page. Tick &quot;Show as Coming Soon&quot; to hide the ledger from contractors.</p>
            <FormGrid>
              <TextInput label="Coming soon message" name="ledgerMessage" defaultValue={c.ledgerMessage} />
              <div className="flex items-end pb-2.5">
                <CheckboxInput label="Show as Coming Soon" name="ledgerComingSoon" defaultChecked={c.ledgerComingSoon} />
              </div>
            </FormGrid>
          </>
        ) : (
          <>
            {c.quickActions.map((q) => (
              <div key={q.key} hidden>
                <input type="hidden" name={`qa_${q.key}_title`} value={q.title} />
                <input type="hidden" name={`qa_${q.key}_subtitle`} value={q.subtitle} />
                {q.visible ? <input type="hidden" name={`qa_${q.key}_visible`} value="on" /> : null}
              </div>
            ))}
            {c.ledgerComingSoon ? <input type="hidden" name="ledgerComingSoon" value="on" /> : null}
            <FormGrid>
              <TextInput label="Points display name" name="pointsLabel" required defaultValue={c.pointsLabel} />
              <TextInput label="Tokens display name" name="tokensLabel" required defaultValue={c.tokensLabel} />
              <SelectInput
                label="Activity approval policy"
                name="activityApprovalMode"
                defaultValue={c.activityApprovalMode}
                options={[
                  { value: 'manual', label: 'Manual - admin approves each activity' },
                  { value: 'auto', label: 'Automatic - credit on submission' },
                ]}
              />
            </FormGrid>
          </>
        )}
      </ActionForm>
    </Panel>
  )
}
