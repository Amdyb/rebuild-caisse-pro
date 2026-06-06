import type { Metadata, Viewport } from 'next'
import './globals.css'
import DarkModeProvider from '@/components/DarkModeProvider'

export const viewport: Viewport = {
  themeColor: '#16a34a',
}

export const metadata: Metadata = {
  title: 'CaissePro',
  description: 'CaissePro by Amdy Labs — Développer le commerce en Afrique',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CaissePro',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#16a34a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CaissePro" />
      </head>
      <body>
        <DarkModeProvider />
        {children}
      </body>
    </html>
  )
}
