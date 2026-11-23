'use client'

import { useRouter } from 'next/navigation'
import { Copy, Eye, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export function ContractorRowActions({ id, name, code }: { id: number; name: string; code: string }) {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-app-bg hover:text-ink"
        aria-label={`Actions for ${name}`}
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => router.push(`/admin/contractors/${id}`)}>
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
  )
}
