import Link from 'next/link'
import { LogoMark } from '@/components/common/Logo'

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-bg-secondary pb-24 md:pb-0">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2.5">
          <LogoMark className="h-8 w-8" />
          <div>
            <p className="font-extrabold">
              Plan<span className="text-primary-600">B</span>
            </p>
            <p className="text-xs text-fg-muted">Le réseau social du futur</p>
          </div>
        </div>
        <nav aria-label="Liens de bas de page">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-fg-muted">
            <li>
            </li>
            <li>
              <Link href="/register" className="hover:text-fg">
                Inscription
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-fg">
                Connexion
              </Link>
            </li>
          </ul>
        </nav>
        <p className="text-xs text-fg-muted">© {new Date().getFullYear()} PlanB — Fait en France 🇫🇷</p>
      </div>
    </footer>
  )
}
