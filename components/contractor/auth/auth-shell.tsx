import { Phone } from 'lucide-react'
import { BrandLogo } from '@/components/contractor/layout/brand-logo'
import { getPublicBranding } from '@/lib/server/contractor-app'

interface AuthShellProps {
  title: string
  description: string
  subtitle?: string
  children: React.ReactNode
}

export async function AuthShell({ title, description, subtitle = 'Contractor Rewards', children }: AuthShellProps) {
  const { brandName, storePhone } = await getPublicBranding()
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col bg-app-bg">
      <header className="flex flex-col items-center gap-3 bg-gradient-to-b from-navy to-navy-2 px-6 pt-[calc(env(safe-area-inset-top)+2.5rem)] pb-14 text-center text-white">
        <BrandLogo className="size-14" />
        <p className="text-lg font-semibold tracking-tight">{brandName}</p>
        <p className="text-xs text-white/70">{subtitle}</p>
      </header>
      <section className="-mt-8 mx-4 flex flex-col gap-5 rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-ink">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </section>
      {storePhone ? (
      <p className="mt-auto flex items-center justify-center gap-1.5 p-6 text-xs text-muted-foreground">
        <Phone className="size-3.5" aria-hidden="true" />
        Need help?{' '}
        <a href={`tel:+${storePhone.replace(/\D/g, '')}`} className="font-semibold text-brand underline-offset-2 hover:underline">
          {storePhone}
        </a>
      </p>
      ) : null}
    </main>
  )
}
