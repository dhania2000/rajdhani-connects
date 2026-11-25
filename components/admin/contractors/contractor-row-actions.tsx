'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Coins, Copy, Eye, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { ProductOption } from '@/lib/server/catalogue-admin'
import { AssignPointsDialog } from './assign-points-dialog'

/** Row "⋯" menu: Assign Points (opens the dialog), View profile, Copy code. */
export function ContractorRowActions({
  contractor,
  code,
  products,
}: {
  contractor: { id: number; name: string; mobile: string }
  code: string
  products: ProductOption[]
}) {
  const router = useRouter()
  const [assignOpen, setAssignOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex size-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-app-bg hover:text-ink"
          aria-label={`Actions for ${contractor.name}`}
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setAssignOpen(true)} className="font-medium text-brand">
            <Coins aria-hidden="true" />
            Assign Points
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push(`/admin/contractors/${contractor.id}`)}>
            <Eye aria-hidden="true" />
            View profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard
                .writeText(code)
                .then(() => toast.success(`Copied ${code}`))
                .catch(() => toast.error('Could not copy code'))
            }}
          >
            <Copy aria-hidden="true" />
            Copy code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AssignPointsDialog contractor={contractor} products={products} open={assignOpen} onOpenChange={setAssignOpen} showTrigger={false} />
    </>
  )
}
