'use client'

import * as React from 'react'

import { useCurrentUser } from '@/lib/session'
import { trpc } from '@/lib/trpc'
import { NavTabs } from './NavTabs'

/**
 * BARRE DE NAVIGATION MOBILE — en bas de l'écran, pour naviguer à une main.
 *
 * Exactement le même langage visuel que la barre du site : fond de la page +
 * filet, cinq onglets avec libellés toujours visibles, orange sur l'onglet
 * actif, orange au survol, et l'onglet Accueil posé dans son double cercle
 * blanc en relief qui dépasse au-dessus de la barre (comme sur la maquette).
 */
export function MobileTabBar() {
  const { isAuthenticated } = useCurrentUser()
  const { data: unreadMessages } = trpc.messages.totalUnread.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  })
  const unreadMsgCount = unreadMessages?.count ?? 0

  // Hauteur réelle publiée pour que le contenu et le chat plein écran s'arrêtent
  // juste au-dessus de la barre.
  const ref = React.useRef<HTMLElement | null>(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const publish = () => {
      const h = Math.round(el.getBoundingClientRect().height)
      document.documentElement.style.setProperty('--bottom-nav-h', `${h}px`)
    }
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    window.addEventListener('orientationchange', publish)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', publish)
    }
  }, [])

  return (
    <nav
      ref={ref}
      aria-label="Navigation principale"
      className="mobile-tabbar fixed inset-x-0 bottom-0 z-50 border-t border-border bg-bg/95 backdrop-blur-lg supports-[backdrop-filter]:bg-bg/85 md:hidden"
    >
      <div className="relative mx-auto flex w-full max-w-2xl items-end justify-between gap-0.5 px-4 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2">
        <NavTabs raised unreadMessages={unreadMsgCount} />
      </div>
    </nav>
  )
}
