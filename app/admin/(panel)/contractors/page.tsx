import Link from 'next/link'
import { Search } from 'lucide-react'
import { CONTRACTOR_PAGE_SIZE, listContractors } from '@/lib/server/contractors'
import { ActionForm } from '@/components/admin/action-form'
import { FormDialog } from '@/components/admin/form-dialog'
import { CheckboxInput } from '@/components/admin/fields'
import { ContractorFields } from '@/components/admin/contractors/contractor-fields'
import { ContractorRowActions } from '@/components/admin/contractors/contractor-row-actions'
import { AssignPointsDialog } from '@/components/admin/contractors/assign-points-dialog'
import { listProductOptions } from '@/lib/server/catalogue-admin'
import { DataTable, EmptyState, fmtNumber, PageHeader, Panel, StatusBadge, Td } from '@/components/admin/ui'
import { cn } from '@/lib/utils'
import { createContractorAction } from '../panel-actions'

const TABS = [
  { value: '', label: 'All' },
  { value: 'pending_approval', label: 'Pending approval' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
]

export default async function ContractorsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const status = sp.status ?? ''
  const q = sp.q?.trim() ?? ''
  const [{ rows, total }, products] = await Promise.all([listContractors({ q, status: status || undefined, page }), listProductOptions()])
  const pages = Math.max(1, Math.ceil(total / CONTRACTOR_PAGE_SIZE))
  const href = (p: Record<string, string | number>) => {
    const params = new URLSearchParams({ ...(q && { q }), ...(status && { status }), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])) })
    for (const [k, v] of [...params]) if (!v) params.delete(k)
    const s = params.toString()
    return `/admin/contractors${s ? `?${s}` : ''}`
  }

  return (
    <>
      <PageHeader
        title="Contractor Management"
        description="Register contractors, approve accounts, and manage their access."
        actions={
          <FormDialog triggerLabel="Add contractor" title="Add contractor" description="The mobile number becomes the username and the first password.">
            <ActionForm action={createContractorAction} submitLabel="Create contractor">
              <ContractorFields />
              <CheckboxInput label="Activate immediately (skip approval)" name="activateNow" defaultChecked />
            </ActionForm>
          </FormDialog>
        }
      />

      <Panel>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Filter by status" className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <Link
                key={t.value}
                href={href({ status: t.value, page: '' })}
                aria-current={status === t.value ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium',
                  status === t.value ? 'bg-brand text-white' : 'text-ink-muted hover:bg-app-bg hover:text-ink',
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <form className="relative w-full lg:w-72" role="search">
            {status ? <input type="hidden" name="status" value={status} /> : null}
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
            <label htmlFor="q" className="sr-only">
              Search contractors
            </label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Search name, mobile, code"
              className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/15"
            />
          </form>
        </div>

        {rows.length === 0 ? (
          <EmptyState title="No contractors found" description={q ? 'Try a different search.' : 'Add a contractor to get started.'} />
        ) : (
          <DataTable head={['Contractor', 'Points', <span key="actions" className="sr-only">Actions</span>]}>
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-app-bg/60">
                <Td>
                  <Link href={`/admin/contractors/${c.id}`} className="flex items-center gap-3 hover:text-brand">
                    {c.photo_url ? (
                      <img src={c.photo_url} alt="" className="size-10 shrink-0 rounded-full border border-border object-cover" />
                    ) : (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lavender text-sm font-semibold text-brand" aria-hidden="true">
                        {c.name
                          .split(/\s+/)
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block font-medium">{c.name}</span>
                      <span className="block text-xs text-ink-muted tabular-nums">{c.mobile}</span>
                      {c.account_status !== 'active' ? (
                        <span className="mt-0.5 block">
                          <StatusBadge status={c.account_status} />
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </Td>
                <Td>
                  <AssignPointsDialog contractor={{ id: c.id, name: c.name, mobile: c.mobile }} products={products} />
                </Td>
                <Td className="w-10 text-right">
                  <ContractorRowActions id={c.id} name={c.name} code={c.contractor_code} />
                </Td>
              </tr>
            ))}
          </DataTable>
        )}

        {pages > 1 ? (
          <div className="mt-4 flex items-center justify-between text-sm text-ink-muted">
            <span>
              Page {page} of {pages} &middot; {fmtNumber(total)} contractors
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={href({ page: page - 1 })} className="rounded-lg border border-border px-3 py-1.5 hover:bg-app-bg">
                  Previous
                </Link>
              ) : null}
              {page < pages ? (
                <Link href={href({ page: page + 1 })} className="rounded-lg border border-border px-3 py-1.5 hover:bg-app-bg">
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </Panel>
    </>
  )
}
