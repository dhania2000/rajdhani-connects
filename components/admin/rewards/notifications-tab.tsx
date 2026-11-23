import { listSentNotifications } from '@/lib/server/admin-rewards'
import { ActionForm } from '@/components/admin/action-form'
import { FormGrid, SelectInput, TextArea, TextInput } from '@/components/admin/fields'
import { DataTable, EmptyState, fmtDate, fmtNumber, Panel, Td } from '@/components/admin/ui'
import { broadcastAction, updateNotificationAction } from '@/app/admin/(panel)/panel-actions'
import { FormDialog } from '@/components/admin/form-dialog'
import { DeleteRecordButton } from '@/components/admin/confirm-action-button'

export async function NotificationsTab() {
  const sent = await listSentNotifications()
  return (
    <>
      <Panel title="Send notification" description="Delivered in-app to the contractor notifications screen.">
        <ActionForm action={broadcastAction} submitLabel="Send">
          <FormGrid>
            <TextInput label="Title" name="title" required maxLength={150} />
            <SelectInput label="Recipients" name="audience" options={[{ value: 'all', label: 'All active contractors' }, { value: 'specific', label: 'Specific contractor IDs' }]} />
            <TextInput label="Contractor IDs (if specific)" name="contractorIds" placeholder="e.g. 3, 7, 12" />
            <TextArea label="Message" name="body" required maxLength={500} className="sm:col-span-2" />
          </FormGrid>
        </ActionForm>
      </Panel>
      <Panel title="Notification history" description="Includes automatic events: approvals, points earned, claim updates, and new offers.">
        {sent.length === 0 ? (
          <EmptyState title="No notifications yet" />
        ) : (
          <DataTable head={['Date', 'Type', 'Title', 'Recipients', 'Read', 'Actions']}>
            {sent.map((n) => (
              <tr key={n.id}>
                <Td>{fmtDate(n.created_at)}</Td>
                <Td className="capitalize">{n.kind}</Td>
                <Td>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-ink-muted">{n.body}</p>
                </Td>
                <Td className="tabular-nums">{fmtNumber(n.recipients)}</Td>
                <Td className="tabular-nums">
                  {fmtNumber(n.read_count)}
                  {Number(n.recipients) ? ` (${Math.round((Number(n.read_count) / Number(n.recipients)) * 100)}%)` : ''}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <FormDialog triggerLabel="Edit" title="Edit notification" variant="edit">
                      <ActionForm action={updateNotificationAction} submitLabel="Save changes">
                        <input type="hidden" name="id" value={n.id} />
                        <TextInput label="Title" name="title" defaultValue={n.title} required maxLength={150} />
                        <TextArea label="Message" name="body" defaultValue={n.body} required maxLength={500} />
                      </ActionForm>
                    </FormDialog>
                    <DeleteRecordButton entity="notification" id={n.id} name={n.title} label="notification" />
                  </div>
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
    </>
  )
}
