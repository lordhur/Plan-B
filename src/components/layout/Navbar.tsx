'use client'

import { Bell, Camera, CalendarPlus, Plus, Store, UsersRound } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogoMark } from '@/components/common/Logo'
import { NavTabs } from './NavTabs'
import { useLang } from '@/lib/i18n'
import { useCurrentUser } from '@/lib/session'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

/**
 * Barre de navigation — calquée au pixel sur la maquette produit :
 *
 *   ( + )                (logo) Plan B                 (🔔)
 *   Communauté · Activité · ⌾ Accueil ⌾ · Message · Profil
 *
 * Deux rangées, filet de séparation, l'onglet Accueil posé dans un double
 * cercle blanc en relief qui chevauche le filet, et animation de « clic ».
 */

/** Menu « Créer » — nouveau plan, story, groupe ou page, sous le bouton +. */
export function CreateMenu({ trigger }: { trigger: React.ReactNode }) {
  const { t } = useLang()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        avoidCollisions={false}
        className="z-[70] max-h-[min(72vh,32rem)] w-56 overflow-y-auto overscroll-contain"
      >
        <DropdownMenuLabel>{t('create_menu')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/events/create">
            <CalendarPlus className="h-4 w-4" aria-hidden /> {t('create_plan')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/stories/new">
            <Camera className="h-4 w-4" aria-hidden /> {t('create_story')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/groups/new">
            <UsersRound className="h-4 w-4" aria-hidden /> {t('create_group')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/pages/new">
            <Store className="h-4 w-4" aria-hidden /> {t('create_page')}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Cloche — accès direct aux notifications (aucun autre menu ici). */
function BellLink({ unreadCount }: { unreadCount: number }) {
  const { t } = useLang()
  return (
    <Link
      href="/notifications"
      aria-label={
        unreadCount > 0
          ? `${t('nav_notifications')} (${unreadCount} non lues)`
          : t('nav_notifications')
      }
      className="relative flex h-10 min-h-0 w-10 items-center justify-center rounded-full text-fg transition-colors hover:bg-bg-secondary hover:text-accent-600 focus-visible:outline-none sm:h-11 sm:w-11"
    >
      <Bell className="h-[23px] w-[23px]" strokeWidth={1.9} aria-hidden />
      {unreadCount > 0 && (
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}

/** Barre de navigation principale (deux rangées, toujours visible). */
export function Navbar() {
  const { isAuthenticated, isLoading } = useCurrentUser()
  const { lang, toggle: toggleLang, t } = useLang()

  const { data: unread } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  })
  const { data: unreadMessages } = trpc.messages.totalUnread.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  })

  // La barre est FIXE : on publie sa hauteur réelle dans `--nav-h` pour que le
  // contenu (et la messagerie plein écran) démarre juste en dessous.
  const headerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const publish = () => {
      const h = Math.round(el.getBoundingClientRect().height)
      document.documentElement.style.setProperty('--nav-h', `${h}px`)
    }
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    window.addEventListener('orientationchange', publish)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', publish)
    }
  }, [isAuthenticated, isLoading, lang])

  return (
    <header
      ref={headerRef}
      className="fixed inset-x-0 top-0 z-50 border-b border-border bg-bg/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-lg supports-[backdrop-filter]:bg-bg/85"
    >
      <div className="mx-auto w-full max-w-2xl px-4 pt-3.5 sm:px-6">
        {/* Rangée 1 : + · logo + « Plan B » · langue + cloche */}
        <div className="grid h-[4.25rem] grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex items-center">
            <CreateMenu
              trigger={
                <button
                  type="button"
                  aria-label={t('nav_create')}
                  className="flex h-10 min-h-0 w-10 items-center justify-center rounded-full transition-transform duration-150 hover:bg-bg-secondary active:scale-90 sm:h-11 sm:w-11"
                >
                  {/* cercle parfaitement rond : carré + border-radius 50 % */}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-fg sm:h-[34px] sm:w-[34px]">
                    <Plus
                      className="h-[15px] w-[15px] sm:h-4 sm:w-4"
                      strokeWidth={2.4}
                      aria-hidden
                    />
                  </span>
                </button>
              }
            />
          </div>

          <Link href="/" className="flex items-center gap-2.5" aria-label="Plan B — accueil">
            <LogoMark className="h-10 w-10 shrink-0 drop-shadow-[0_2px_4px_rgba(15,23,42,0.18)] min-[380px]:h-11 min-[380px]:w-11 sm:h-12 sm:w-12" />
            <span className="whitespace-nowrap text-[1.55rem] font-extrabold leading-none tracking-[-0.02em] text-fg min-[380px]:text-[1.75rem] sm:text-[1.9rem]">
              Plan<span className="wordmark-b">B</span>
            </span>
          </Link>

          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={toggleLang}
              className="flex h-6 min-h-0 w-7 items-center justify-center rounded-full border border-border text-[9px] font-black tracking-wide text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg min-[380px]:h-7 min-[380px]:w-9 min-[380px]:text-[10px]"
              aria-label={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
              title={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
            >
              {lang === 'fr' ? 'FR' : 'EN'}
            </button>

            {isLoading ? (
              <div className="h-9 w-9 animate-pulse-soft rounded-full bg-border" aria-hidden />
            ) : isAuthenticated ? (
              <BellLink unreadCount={unread?.count ?? 0} />
            ) : (
              <Button asChild size="sm" className="h-9 rounded-full px-3 text-xs">
                <Link href="/login">{t('nav_login')}</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Rangée 2 : les cinq onglets (site ; sur mobile ils passent en bas) */}
        <nav
          aria-label="Navigation principale"
          className="relative hidden items-end justify-between gap-0.5 pb-2.5 pt-2 md:flex"
        >
          <NavTabs unreadMessages={unreadMessages?.count ?? 0} />
        </nav>
      </div>
    </header>
  )
}
