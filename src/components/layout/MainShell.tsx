'use client'

import { usePathname } from 'next/navigation'
import { Footer } from './Footer'

/**
 * Coquille du contenu principal.
 *
 * - Réserve en haut la hauteur exacte de la barre de navigation fixe (`--nav-h`).
 * - En mode « messagerie » (conversation privée, chat d'événement), masque le
 *   pied de page et laisse la conversation occuper toute la fenêtre : la zone
 *   de saisie reste collée en bas de l'écran et reste visible.
 */
export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const immersive = /^\/(messages\/[^/]+|events\/[^/]+\/chat)\/?$/.test(pathname ?? '')

  return (
    <>
      <div
        className="mx-auto flex w-full max-w-6xl flex-1 flex-col"
        style={{ paddingTop: 'var(--nav-h, 4.5rem)' }}
      >
        <main
          id="main"
          className={
            immersive
              ? 'flex min-h-0 w-full flex-1 flex-col'
              : 'w-full min-w-0 flex-1 px-4 py-6'
          }
        >
          {children}
        </main>
      </div>
      {!immersive && <Footer />}
    </>
  )
}
