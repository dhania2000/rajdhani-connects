import Link from 'next/link'
import { Search } from 'lucide-react'
import { CONTRACTOR_PAGE_SIZE, listContractors } from '@/lib/server/contractors'
import { ActionForm } from '@/components/admin/action-form'
import { FormDialog } from '@/components/admin/form-dialog'
import { CheckboxInput } from '@/components/admin/fields'
import { ContractorFields } from '@/components/admin/contractors/contractor-fields'
import { ContractorRowActions } from '@/components/admin/contractors/contractor-row-actions'
import { listProductOptions } from '@/lib/server/catalogue-admin'
import { EmptyState, fmtNumber, PageHeader, Panel, StatusBadge } from '@/components/admin/ui'
import { cn } from '@/lib/utils'
import { createContractorAction } from '../panel-actions'

const TABS = [
  { value: '', label: 'All' },
  { value: 'pending_approval', label: 'Pending approval' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
]

/** Rank by points earned to date: gold / silver / bronze for the top three. */
function RankBadge({ rank, earned }: { rank: number; earned: number }) {
  const medal = rank === 1 ? 'bg-amber-400 text-amber-950' : rank === 2 ? 'bg-slate-300 text-slate-900' : rank === 3 ? 'bg-orange-300 text-orange-950' : 'bg-app-bg text-ink-muted'
  return (
    <span
      className={cn('flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums', earned > 0 ? medal : 'bg-app-bg text-ink-muted')}
      title={earned > 0 ? `Rank ${rank} by points earned` : 'No points earned yet'}
      aria-label={earned > 0 ? `Rank ${rank}` : 'Not ranked yet'}
    >
      {earned > 0 ? `#${rank}` : '–'}
    </span>
  )
}

export default async function ContractorsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const status = sp.status ?? ''
  const q = sp.q?.trim() ?? ''
  const [{ rows, total }, allProducts] = await Promise.all([listContractors({ q, status: status || undefined, page }), listProductOptions()])
  // Assign Points offers only the Tile Adhesive / Glue category (code "adhesive").
  const products = allProducts.filter((p) => p.categorySlug === 'adhesive')
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
        description="Ranked by points earned to date. Use ⋯ on a contractor to assign points."
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
          <ul className="divide-y divide-border overflow-hidden rounded-[10px] border border-border">
            {rows.map((c) => (
              <li key={c.id} className="flex min-w-0 items-center gap-2.5 px-3 py-2.5 hover:bg-app-bg/60 sm:gap-3 sm:px-4">
                <RankBadge rank={Number(c.rank)} earned={Number(c.earned)} />
                <Link href={`/admin/contractors/${c.id}`} className="flex min-w-0 flex-1 items-center gap-2.5 hover:text-brand">
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
                    {/* Full name and number: wrap rather than cut off. */}
                    <span className="block font-medium break-words">{c.name}</span>
                    <span className="block text-xs text-ink-muted tabular-nums">{c.mobile}</span>
                    <span className="block text-xs text-ink-muted tabular-nums">{fmtNumber(c.earned)} pts earned</span>
                    {c.account_status !== 'active' ? (
                      <span className="mt-0.5 block">
                        <StatusBadge status={c.account_status} />
                      </span>
                    ) : null}
                  </span>
                </Link>
                <div className="shrink-0">
                  <ContractorRowActions contractor={{ id: c.id, name: c.name, mobile: c.mobile }} code={c.contractor_code} products={products} />
                </div>
              </li>
            ))}
          </ul>
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
