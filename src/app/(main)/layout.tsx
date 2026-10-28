import { Navbar } from '@/components/layout/Navbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { MainShell } from '@/components/layout/MainShell'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { AuroraBackground } from '@/components/common/AuroraBackground'

/**
 * Layout principal : barre de navigation FIXE (toujours visible, y compris en
 * bas de page), contenu décalé de sa hauteur exacte, bottom nav mobile.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <AuroraBackground />
      <Navbar />
      <MainShell>
        <ErrorBoundary>{children}</ErrorBoundary>
      </MainShell>
      <BottomNav />
    </div>
  )
}
