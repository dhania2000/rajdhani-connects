'use client'

import { useMemo, useState } from 'react'

interface Option {
  id: number
  name: string
  contractor_code: string
  mobile: string
}

/** Chooses who receives a bulk points adjustment: every active contractor, or a hand-picked list. */
export function ContractorMultiPicker({ contractors }: { contractors: Option[] }) {
  const [target, setTarget] = useState<'all_active' | 'selected'>('all_active')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contractors
    return contractors.filter((c) => [c.name, c.contractor_code, c.mobile].some((f) => f.toLowerCase().includes(q)))
  }, [contractors, query])

  const allVisibleSelected = visible.length > 0 && visible.every((c) => selected.has(c.id))

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleVisible() {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const c of visible) {
        if (allVisibleSelected) next.delete(c.id)
        else next.add(c.id)
      }
      return next
    })
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1.5 text-sm font-medium text-ink">Recipients</legend>
      <div className="flex flex-wrap gap-4 text-sm text-ink">
        <label className="flex items-center gap-2">
          <input type="radio" name="target" value="all_active" checked={target === 'all_active'} onChange={() => setTarget('all_active')} className="accent-brand" />
          All active contractors
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="target" value="selected" checked={target === 'selected'} onChange={() => setTarget('selected')} className="accent-brand" />
          Selected contractors
        </label>
      </div>

      {target === 'selected' && (
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, code or mobile"
              aria-label="Search contractors"
              className="h-9 min-w-48 flex-1 rounded-md border border-border bg-white px-3 text-sm"
            />
            <button type="button" onClick={toggleVisible} className="h-9 rounded-md border border-border px-3 text-sm font-medium text-ink hover:bg-muted">
              {allVisibleSelected ? 'Clear shown' : 'Select shown'}
            </button>
            <span className="text-xs text-ink-muted">{selected.size} selected</span>
          </div>
          <ul className="max-h-64 overflow-y-auto divide-y divide-border">
            {visible.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-2.5 py-2 text-sm">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="size-4 accent-brand" />
                  <span className="font-medium text-ink">{c.name}</span>
                  <span className="text-xs text-ink-muted">
                    {c.contractor_code} · {c.mobile}
                  </span>
                </label>
              </li>
            ))}
            {visible.length === 0 && <li className="py-2 text-sm text-ink-muted">No contractors match.</li>}
          </ul>
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="contractorIds" value={id} />
          ))}
        </div>
      )}
    </fieldset>
  )
}
