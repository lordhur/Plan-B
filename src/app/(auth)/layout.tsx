import { Logo } from '@/components/common/Logo'
import { AuroraBackground } from '@/components/common/AuroraBackground'

/** Layout des pages d'authentification — carte centrée. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <AuroraBackground />
      <header className="flex justify-center p-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
