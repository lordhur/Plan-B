import { LogoMark } from '@/components/common/Logo'

/**
 * Pied de page ultra-compact — TOUT sur une seule ligne (spec mobile).
 * Logo · nom · slogan · copyright, sans liens Connexion/Inscription.
 * La taille du texte se réduit avec la largeur de l'écran pour tenir sur une ligne.
 */
export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-8 border-t border-border bg-bg-secondary pb-20 md:pb-0">
      <div className="mx-auto flex max-w-6xl flex-nowrap items-center justify-center gap-1.5 overflow-hidden px-3 py-2.5 md:justify-between md:gap-4 md:px-4 md:py-4">
        <span className="flex shrink-0 items-center gap-1.5">
          <LogoMark className="h-5 w-5 shrink-0 md:h-7 md:w-7" />
          <span className="whitespace-nowrap text-[11px] font-extrabold leading-none md:text-sm">
            Plan<span className="text-primary-600">B</span>
          </span>
        </span>

        <span className="hidden whitespace-nowrap text-xs text-fg-muted md:inline">Le réseau social du futur</span>

        <span className="min-w-0 truncate whitespace-nowrap text-[10px] leading-none text-fg-muted md:text-xs">
          <span className="md:hidden">
            Le réseau social du futur · © {year} — Fait en France 🇫🇷
          </span>
          <span className="hidden md:inline">
            © {year} PlanB — Fait en France 🇫🇷
          </span>
        </span>
      </div>
    </footer>
  )
}
