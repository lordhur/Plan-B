import { Navbar } from '@/components/layout/Navbar'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { PresencePing } from '@/components/layout/PresencePing'
import { MainShell } from '@/components/layout/MainShell'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { AuroraBackground } from '@/components/common/AuroraBackground'

/**
 * Layout principal :
 * - site : barre FIXE en haut, deux rangées (marque + onglets) ;
 * - mobile : marque en haut, onglets dans une barre FIXE en bas (une main) —
 *   même style, mêmes couleurs et mêmes animations que celle du site.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <AuroraBackground />
      <Navbar />
      <MainShell>
        <ErrorBoundary>{children}</ErrorBoundary>
      </MainShell>
      <MobileTabBar />
      <PresencePing />
    </div>
  )
}
