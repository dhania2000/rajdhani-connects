import { cn } from '@/lib/utils'

const DEFAULT_MARK = '/images/brand/rajdhani-mark.png'
const DEFAULT_FULL = '/images/brand/rajdhani-logo.png'

/**
 * The logo on a white rounded tile, so it reads on the navy headers.
 * `src` is the logo uploaded in App Content Control; empty = built-in Rajdhani mark.
 */
export function BrandLogo({ className = 'size-8', src }: { className?: string; src?: string | null }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] bg-white shadow-sm', className)} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src || DEFAULT_MARK} alt="" className="size-[86%] object-contain" />
    </span>
  )
}

/** The full logo on a white card, for login and logged-out screens. */
export function BrandLogoFull({ className = 'w-40', src }: { className?: string; src?: string | null }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-2xl bg-white p-3 shadow-sm', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src || DEFAULT_FULL} alt="Logo" className="h-auto max-h-40 w-full object-contain" />
    </span>
  )
}
