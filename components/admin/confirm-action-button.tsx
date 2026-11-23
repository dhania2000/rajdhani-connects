'use client'

import { useActionState, useEffect, useState, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { deleteRecordAction, type AdminActionState } from '@/app/admin/(panel)/panel-actions'

type Action = (prev: AdminActionState, formData: FormData) => Promise<AdminActionState>

export function ConfirmActionButton({
  action,
  fields,
  title,
  description,
  confirmLabel = 'Delete',
  destructive = true,
  trigger,
  triggerLabel,
  className,
  onDone,
}: {
  action: Action
  fields: Record<string, string | number>
  title: string
  description: ReactNode
  confirmLabel?: string
  destructive?: boolean
  trigger?: ReactNode
  triggerLabel?: string
  className?: string
  onDone?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState<AdminActionState, FormData>(action, {})

  useEffect(() => {
    if (state.error) toast.error(state.error)
    else if (state.message) {
      toast.success(state.message)
      setOpen(false)
      onDone?.()
    }
  }, [state, onDone])

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="contents">
          {trigger}
        </span>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className={cn(destructive && 'text-destructive hover:bg-destructive/10 hover:text-destructive', className)}
          aria-label={triggerLabel ?? confirmLabel}
        >
          <Trash2 aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">{triggerLabel ?? confirmLabel}</span>
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <form action={formAction}>
            {Object.entries(fields).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={String(v)} />
            ))}
            {state.error ? (
              <p role="alert" className="mb-3 text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <ConfirmSubmit label={confirmLabel} destructive={destructive} />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ConfirmSubmit({ label, destructive }: { label: string; destructive: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {pending ? 'Working...' : label}
    </Button>
  )
}

export function DeleteRecordButton({
  entity,
  id,
  name,
  label,
}: {
  entity: 'rule' | 'activity' | 'gift' | 'redemption' | 'offer' | 'notification' | 'target' | 'account_entry' | 'product' | 'product_category'
  id: number
  name: string
  label: string
}) {
  return (
    <ConfirmActionButton
      action={deleteRecordAction}
      fields={{ entity, id }}
      title={`Delete this ${label}?`}
      description={
        <>
          <span className="font-medium text-ink">{name}</span> will be permanently removed. This cannot be undone.
        </>
      }
    />
  )
}
