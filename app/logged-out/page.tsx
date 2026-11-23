import Link from 'next/link'
import { BrandLogo } from '@/components/contractor/layout/brand-logo'
import { getPublicBranding } from '@/lib/server/contractor-app'

export const dynamic = 'force-dynamic'

export default async function LoggedOutPage() {
  const { brandName } = await getPublicBranding()
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col items-center justify-center gap-4 bg-gradient-to-b from-navy to-navy-2 p-8 text-center text-white">
      <BrandLogo className="size-16" />
      <h1 className="text-xl font-bold">{brandName}</h1>
      <p className="text-sm text-white/75">You have been logged out of the Contractor Rewards app.</p>
      <Link href="/contractor/login" className="mt-2 flex h-11 items-center rounded-lg bg-white px-6 text-sm font-semibold text-navy">
        Log in again
      </Link>
    </main>
  )
}
