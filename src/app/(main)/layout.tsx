import { Navbar } from '@/components/layout/Navbar'
import { BottomNav } from '@/components/layout/BottomNav'
import { Footer } from '@/components/layout/Footer'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { AuroraBackground } from '@/components/common/AuroraBackground'

/** Layout principal : navbar fixe + sidebar desktop + bottom nav mobile. */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <AuroraBackground />
      <Navbar />
      <div className="mx-auto flex w-full max-w-6xl flex-1">
        <main id="main" className="min-w-0 flex-1 px-4 py-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <Footer />
      <BottomNav />
    </div>
  )
}
