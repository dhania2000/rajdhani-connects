'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}

export function ContractorAvatar({
  src,
  name,
  sizes,
  priority,
  className,
  textClassName,
}: {
  src: string
  name: string
  sizes: string
  priority?: boolean
  className?: string
  textClassName?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = Boolean(src) && failedSrc !== src

  return (
    <div className={cn('relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dbe7f7]', className)}>
      {showImage ? (
        <Image
          key={src}
          src={src}
          alt={`${name} profile photo`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span className={cn('font-bold text-brand', textClassName)} aria-label={`${name} profile photo`} role="img">
          {initialsOf(name)}
        </span>
      )}
    </div>
  )
}
