import { Navbar } from '@/components/layout/Navbar'
import { MainShell } from '@/components/layout/MainShell'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { AuroraBackground } from '@/components/common/AuroraBackground'

/**
 * Layout principal : barre de navigation FIXE à deux rangées (toujours
 * visible, y compris en bas de page) + contenu décalé de sa hauteur exacte.
 * La navigation mobile est désormais intégrée à cette barre unique : plus de
 * barre du bas, donc plus aucun risque de zoom ou de disparition.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <AuroraBackground />
      <Navbar />
      <MainShell>
        <ErrorBoundary>{children}</ErrorBoundary>
      </MainShell>
    </div>
  )
}
