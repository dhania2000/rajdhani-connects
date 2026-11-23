import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:opacity-60'

interface FieldProps {
  label: string
  name: string
  hint?: string
  className?: string
}

export function Field({ label, name, hint, className, children }: FieldProps & { children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={name} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
    </div>
  )
}

export function TextInput({
  label,
  name,
  hint,
  className,
  ...props
}: FieldProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'>) {
  return (
    <Field label={label} name={name} hint={hint} className={className}>
      <input id={name} name={name} className={inputClass} {...props} />
    </Field>
  )
}

export function TextArea({
  label,
  name,
  hint,
  className,
  ...props
}: FieldProps & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'>) {
  return (
    <Field label={label} name={name} hint={hint} className={className}>
      <textarea id={name} name={name} rows={3} className={cn(inputClass, 'h-auto py-2')} {...props} />
    </Field>
  )
}

export function SelectInput({
  label,
  name,
  hint,
  className,
  options,
  ...props
}: FieldProps & {
  options: { value: string | number; label: string }[]
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'>) {
  return (
    <Field label={label} name={name} hint={hint} className={className}>
      <select id={name} name={name} className={inputClass} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function CheckboxInput({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-brand" />
      {label}
    </label>
  )
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
}
