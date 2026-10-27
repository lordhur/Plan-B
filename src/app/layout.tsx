import type { Metadata, Viewport } from 'next'
import '@fontsource-variable/inter'
import './globals.css'
import { TRPCProvider } from '@/lib/trpc'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toast'
import { PWARegister } from '@/components/pwa-register'
import { LangProvider } from '@/lib/i18n'
import { AutoTranslate } from '@/components/common/AutoTranslate'

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
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Bloque le pinch-zoom sur iOS Safari (qui ignore user-scalable=no) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var p=function(e){e.preventDefault()};document.addEventListener('gesturestart',p);document.addEventListener('gesturechange',p);document.addEventListener('gestureend',p);var t=null;document.addEventListener('touchend',function(e){var n=Date.now();if(t&&n-t<350){e.preventDefault()}t=n},{passive:false});document.addEventListener('wheel',function(e){if(e.ctrlKey){e.preventDefault()}},{passive:false})})();`,
          }}
        />
      </head>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TRPCProvider>
            <LangProvider>
              <AutoTranslate />
              {children}
              <Toaster />
              <PWARegister />
            </LangProvider>
          </TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
