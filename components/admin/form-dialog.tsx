'use client'

import type { ReactNode } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function FormDialog({
  triggerLabel,
  title,
  description,
  children,
  variant = 'create',
}: {
  triggerLabel: string
  title: string
  description?: string
  children: ReactNode
  variant?: 'create' | 'edit'
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant={variant === 'create' ? 'default' : 'outline'} size={variant === 'create' ? 'default' : 'sm'} className={variant === 'create' ? 'h-10 px-4' : undefined} />
        }
      >
        {variant === 'create' ? <Plus aria-hidden="true" /> : <Pencil aria-hidden="true" />}
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
