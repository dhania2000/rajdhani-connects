import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterDropdownProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}

export function FilterDropdown<T extends string>({ label, value, options, onChange, className }: FilterDropdownProps<T>) {
  return (
    <div className={cn('relative', className)}>
      <label className="sr-only" htmlFor={`filter-${label}`}>
        {label}
      </label>
      <select
        id={`filter-${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-8 w-full appearance-none rounded-md border border-border bg-white py-0 pr-8 pl-3 text-[13px] font-medium text-ink shadow-xs focus-visible:outline-2 focus-visible:outline-brand"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink" aria-hidden="true" />
    </div>
  )
}
