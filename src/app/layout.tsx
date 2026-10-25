import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/inter'
import './globals.css'
import { TRPCProvider } from '@/lib/trpc'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toast'
import { PWARegister } from '@/components/pwa-register'

export const metadata: Metadata = {
  title: {
    default: 'PlanB — Ne postez plus ce que vous avez fait. Postez ce que vous allez faire.',
    template: '%s · PlanB',
  },
  description:
    'PlanB est le réseau social du futur : créez des plans près de chez vous, rejoignez ceux de vos voisins en un clic. Sport, sorties, culture, rencontres — il se passe toujours quelque chose autour de vous.',
  keywords: ['sorties', 'événements', 'rencontres', 'activités', 'social', 'PlanB'],
  authors: [{ name: 'PlanB' }],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'PlanB',
    title: 'PlanB — Le réseau social du futur',
    description: 'Postez ce que vous allez faire. Les autres rejoignent en un clic.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PlanB — Le réseau social du futur',
    description: 'Postez ce que vous allez faire. Les autres rejoignent en un clic.',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PlanB',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TRPCProvider>
            {children}
            <Toaster />
            <PWARegister />
          </TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
