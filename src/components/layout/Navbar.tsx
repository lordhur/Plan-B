'use client'

import {
  Bell,
  Camera,
  CalendarDays,
  CalendarHeart,
  CalendarPlus,
  HelpCircle,
  LogOut,
  MessageCircle,
  Moon,
  Plus,
  Settings,
  Store,
  Sun,
  User as UserIcon,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

import { Avatar } from '@/components/ui/avatar'
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

interface NavTab {
  href: string
  labelKey: string
  icon?: LucideIcon
  home?: boolean
}

const TABS: NavTab[] = [
  { href: '/community', labelKey: 'nav_community', icon: Users },
  { href: '/events/calendar', labelKey: 'nav_activity', icon: CalendarDays },
  { href: '/', labelKey: 'nav_feed', home: true },
  { href: '/messages', labelKey: 'nav_message', icon: MessageCircle },
  { href: '/profile', labelKey: 'nav_profile_tab', icon: UserIcon },
]

/** Maison pleine, porte évidée — dessin de la maquette. */
function HouseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11.29 2.29a1 1 0 0 1 1.42 0l9 9a1 1 0 0 1-1.42 1.42l-.29-.3V21a1 1 0 0 1-1 1h-4.25v-5.5a1 1 0 0 0-1-1h-3.5a1 1 0 0 0-1 1V22H5a1 1 0 0 1-1-1v-8.59l-.29.3a1 1 0 0 1-1.42-1.42z"
      />
    </svg>
  )
}
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

/** Onglet standard (hors Accueil). */
function TabLink({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/' && pathname.startsWith(href))
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="nav-tab group flex min-h-[3.25rem] flex-1 flex-col items-center justify-end gap-2 rounded-xl px-0.5 pb-0.5 transition-colors"
    >
      <Icon
        className={cn(
          'nav-tab-glyph h-[21px] w-[21px] transition-transform duration-200 group-active:scale-90',
          active ? 'text-fg' : 'text-fg/85',
        )}
        strokeWidth={active ? 2.1 : 1.9}
        aria-hidden
      />
      <span
        className={cn(
          'nav-tab-glyph max-w-full truncate text-[10px] leading-none tracking-tight sm:text-[11px]',
          active ? 'font-bold text-fg' : 'font-medium text-fg/85',
        )}
      >
        {label}
      </span>
    </Link>
  )
}

/**
 * Onglet Accueil — DOUBLE cercle blanc en relief (anneau extérieur + pastille
 * intérieure), icône orange, et animation de « clic » à chaque appui.
 */
function HomeTab({ label }: { label: string }) {
  const pathname = usePathname()
  const active = pathname === '/'
  const [tap, setTap] = useState(0)

  return (
    <Link
      href="/"
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      onClick={() => {
        setTap((n) => n + 1)
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(8)
          } catch {
            /* ignoré si l'appareil refuse */
          }
        }
      }}
      className="nav-home group relative z-10 flex flex-1 flex-col items-center justify-end"
    >
      {/* Aura orange : halo en dégradé qui se dégage du bouton au survol */}
      <span aria-hidden className="home-aura" />

      {/* Anneau extérieur (le cercle qui manquait) */}
      <span
        key={tap}
        className={cn(
          'home-pill relative -mb-[14px] flex h-16 w-16 shrink-0 items-center justify-center rounded-full min-[380px]:h-[4.5rem] min-[380px]:w-[4.5rem]',
          'transition-transform duration-150 group-active:scale-95',
          tap > 0 && 'animate-home-tap',
        )}
      >
        {tap > 0 && (
          <span aria-hidden className="animate-home-ring pointer-events-none absolute inset-0 rounded-full" />
        )}
        {/* Pastille intérieure */}
        <span className="home-pill-inner relative flex h-[3.375rem] w-[3.375rem] flex-col items-center justify-center gap-[3px] rounded-full min-[380px]:h-[3.75rem] min-[380px]:w-[3.75rem]">
          <HouseIcon
            className={cn(
              'nav-home-glyph h-[21px] w-[21px] transition-colors duration-200',
              active ? 'text-accent-600' : 'text-fg/70',
            )}
          />
          <span
            className={cn(
              'nav-home-glyph max-w-full truncate px-1 text-[10px] leading-none tracking-tight sm:text-[11px]',
              active ? 'font-bold text-fg' : 'font-medium text-fg/85',
            )}
          >
            {label}
          </span>
        </span>
      </span>
    </Link>
  )
}

/** Menu du compte — notifications, messages, agenda, thème, réglages, sortie. */
function AccountMenu({
  unreadCount,
  unreadMsgCount,
}: {
  unreadCount: number
  unreadMsgCount: number
}) {
  const router = useRouter()
  const { t } = useLang()
  const { theme, setTheme } = useTheme()
  const utils = trpc.useUtils()
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, undefined as never)
      router.push('/login')
      router.refresh()
    },
  })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('nav_notifications')}
          className="relative flex h-10 w-10 min-h-0 items-center justify-center rounded-full text-fg transition-colors hover:bg-bg-secondary focus-visible:outline-none sm:h-11 sm:w-11"
        >
          <Bell className="h-[23px] w-[23px]" strokeWidth={1.9} aria-hidden />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        alignOffset={-6}
        sideOffset={8}
        avoidCollisions={false}
        className="z-[70] max-h-[min(72vh,32rem)] w-60 overflow-y-auto overscroll-contain"
      >
        <DropdownMenuItem asChild>
          <Link href="/notifications">
            <Bell className="h-4 w-4" aria-hidden /> {t('nav_notifications')}
            {unreadCount > 0 && (
              <span className="ml-auto rounded-full bg-danger-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/messages">
            <MessageCircle className="h-4 w-4" aria-hidden /> {t('nav_messages')}
            {unreadMsgCount > 0 && (
              <span className="ml-auto rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
              </span>
            )}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')
          }
        >
          {theme === 'dark' ? (
            <Moon className="h-4 w-4" aria-hidden />
          ) : (
            <Sun className="h-4 w-4" aria-hidden />
          )}
          {t('nav_theme')} :{' '}
          {theme === 'dark'
            ? t('nav_theme_dark')
            : theme === 'light'
              ? t('nav_theme_light')
              : t('nav_theme_auto')}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/agenda">
            <CalendarHeart className="h-4 w-4" aria-hidden /> {t('nav_agenda')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile/settings">
            <Settings className="h-4 w-4" aria-hidden /> {t('nav_settings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/contact">
            <HelpCircle className="h-4 w-4" aria-hidden /> {t('nav_contact')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => logout.mutate()}
          className="text-danger-500 focus:text-danger-600"
        >
          <LogOut className="h-4 w-4" aria-hidden /> {t('nav_logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
                  className="flex h-10 w-10 min-h-0 items-center justify-center rounded-full transition-transform duration-150 hover:bg-bg-secondary active:scale-90 sm:h-11 sm:w-11"
                >
                  {/* cercle parfaitement rond : carré + border-radius 50 % */}
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-fg sm:h-[34px] sm:w-[34px]">
                    <Plus className="h-[15px] w-[15px] sm:h-4 sm:w-4" strokeWidth={2.4} aria-hidden />
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
              <AccountMenu
                unreadCount={unread?.count ?? 0}
                unreadMsgCount={unreadMessages?.count ?? 0}
              />
            ) : (
              <Button asChild size="sm" className="h-9 rounded-full px-3 text-xs">
                <Link href="/login">{t('nav_login')}</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Rangée 2 : les cinq onglets, Accueil dans son double cercle */}
        <nav
          aria-label="Navigation principale"
          className="relative flex items-end justify-between gap-0.5 pb-2.5 pt-2"
        >
          {TABS.map((tab) =>
            tab.home || !tab.icon ? (
              <HomeTab key={tab.href} label={t(tab.labelKey)} />
            ) : (
              <TabLink key={tab.href} href={tab.href} label={t(tab.labelKey)} icon={tab.icon} />
            ),
          )}
        </nav>
      </div>
    </header>
  )
}
