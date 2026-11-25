import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Rajdhani Connects – Contractor Rewards',
  description:
    'Contractor rewards app for Rajdhani Connects partners: track referred sales, earn rewards, redeem gifts and view offers.',
  applicationName: 'Rajdhani Contractor Rewards',
  // Home-screen behaviour on iPhone (Share > Add to Home Screen).
  appleWebApp: { capable: true, title: 'Rajdhani Connects', statusBarStyle: 'black-translucent' },
  // Favicon and home-screen icon come from app/icon.png and app/apple-icon.png (the Rajdhani logo).
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
