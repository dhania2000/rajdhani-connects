import { cn } from '@/lib/utils'

/** The Rajdhani "R + house" mark on a white rounded tile, so it reads on the navy headers. */
export function BrandLogo({ className = 'size-8' }: { className?: string }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] bg-white shadow-sm', className)} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/brand/rajdhani-mark.png" alt="" className="size-[86%] object-contain" />
    </span>
  )
}

/** The full Rajdhani logo (mark + name) on a white card, for login and logged-out screens. */
export function BrandLogoFull({ className = 'w-40' }: { className?: string }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-2xl bg-white p-3 shadow-sm', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/brand/rajdhani-logo.png" alt="Rajdhani" className="h-auto w-full object-contain" />
    </span>
  )
}
