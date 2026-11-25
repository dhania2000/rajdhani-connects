import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { getLogoUrl, logoVersion } from '@/lib/server/branding'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

const baseMetadata: Metadata = {
  title: 'Rajdhani Connects – Contractor Rewards',
  description:
    'Contractor rewards app for Rajdhani Connects partners: track referred sales, earn rewards, redeem gifts and view offers.',
  applicationName: 'Rajdhani Tiles',
  // Home-screen behaviour on iPhone (Share > Add to Home Screen).
  appleWebApp: { capable: true, title: 'Rajdhani Tiles', statusBarStyle: 'black-translucent' },
}

/** Favicon and iPhone home-screen icon follow the logo uploaded in App Content Control. */
export async function generateMetadata(): Promise<Metadata> {
  const v = logoVersion(await getLogoUrl())
  return {
    ...baseMetadata,
    icons: {
      icon: [{ url: `/brand-icon/favicon?v=${v}`, type: 'image/png', sizes: '64x64' }],
      apple: [{ url: `/brand-icon/apple?v=${v}`, type: 'image/png', sizes: '180x180' }],
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light',
  themeColor: '#141b3d',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} bg-app-bg`}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
