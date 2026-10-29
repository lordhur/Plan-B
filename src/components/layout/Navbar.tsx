'use client'

import {
  Bell,
  Camera,
  CalendarDays,
  CalendarHeart,
  CalendarPlus,
  HelpCircle,
  Home,
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
 * Barre de navigation — reproduction du visuel produit :
 *
 *   ( + )            (logo) Plan B              (cloche)
 *   Communauté · Activité · ⬤ACCUEIL⬤ · Message · Profil
 *
 * Deux rangées, fond blanc, filet de séparation ; l'onglet Accueil est posé
 * dans une pastille blanche en relief qui déborde légèrement du filet, avec
 * une animation de « clic » à chaque appui.
 */

const TABS = [
  { href: '/community', labelKey: 'nav_community', icon: Users },
  { href: '/events/calendar', labelKey: 'nav_activity', icon: CalendarDays },
  { href: '/', labelKey: 'nav_feed', icon: Home, home: true },
  { href: '/messages', labelKey: 'nav_message', icon: MessageCircle },
  { href: '/profile', labelKey: 'nav_profile_tab', icon: UserIcon },
] as const

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

/** Maison pleine, porte évidée en bas — dessin de la maquette. */
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

/** Onglet standard (hors Accueil). */
function TabLink({
  href,
  label,
  icon: Icon,
}: {
  href: string
  label: string
  icon: typeof Home
}) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/' && pathname.startsWith(href))
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex min-h-[3.25rem] flex-1 flex-col items-center justify-start gap-1 rounded-xl px-0.5 pt-1.5 text-[11px] font-semibold transition-colors',
        active ? 'text-fg' : 'text-fg-muted hover:text-fg',
      )}
    >
      <Icon
        className={cn(
          'h-[22px] w-[22px] transition-transform duration-200 group-active:scale-90',
          active ? 'stroke-[2.3]' : 'stroke-[1.9]',
        )}
        aria-hidden
      />
      <span className="max-w-full truncate text-[10px] leading-none tracking-tight min-[380px]:text-[11px]">
        {label}
      </span>
    </Link>
  )
}

/**
 * Onglet Accueil — pastille blanche en relief, icône orange, et animation de
 * pression à chaque clic (même si l'on est déjà sur le fil).
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
        // Retour haptique léger sur mobile — renforce l'effet de « clic ».
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(8)
          } catch {
            /* ignoré si l'appareil refuse */
          }
        }
      }}
      className="group relative z-10 flex flex-1 flex-col items-center justify-start"
    >
      <span
        key={tap}
        className={cn(
          'relative -mb-3 -mt-2 flex h-[3.75rem] w-[3.75rem] flex-col items-center justify-center gap-0.5 rounded-full bg-card',
          'shadow-[0_2px_10px_rgba(15,23,42,0.16),0_0_0_1px_rgba(15,23,42,0.06)]',
          'transition-transform duration-150 group-active:scale-95',
          tap > 0 && 'animate-home-tap',
        )}
      >
        {tap > 0 && (
          <span
            aria-hidden
            className="animate-home-ring pointer-events-none absolute inset-0 rounded-full bg-accent-500/25"
          />
        )}
        <HouseIcon
          className={cn(
            'relative h-[23px] w-[23px] transition-colors duration-200',
            active ? 'text-accent-600' : 'text-fg-muted group-hover:text-accent-600',
          )}
        />
        <span
          className={cn(
            'relative max-w-full truncate px-1 text-[10px] leading-none tracking-tight min-[380px]:text-[11px]',
            active ? 'font-extrabold text-fg' : 'font-semibold text-fg-muted',
          )}
        >
          {label}
        </span>
      </span>
    </Link>
  )
}

/** Menu du compte — notifications, messages, agenda, thème, réglages, sortie. */
function AccountMenu({ unreadCount, unreadMsgCount }: { unreadCount: number; unreadMsgCount: number }) {
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
          className="relative flex h-11 w-11 items-center justify-center rounded-full text-fg transition-colors hover:bg-bg-secondary focus-visible:outline-none"
        >
          <Bell className="h-[22px] w-[22px]" aria-hidden />
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
          onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
        >
          {theme === 'dark' ? (
            <Moon className="h-4 w-4" aria-hidden />
          ) : theme === 'light' ? (
            <Sun className="h-4 w-4" aria-hidden />
          ) : (
            <Sun className="h-4 w-4" aria-hidden />
          )}
          {t('nav_theme')} :{' '}
          {theme === 'dark' ? t('nav_theme_dark') : theme === 'light' ? t('nav_theme_light') : t('nav_theme_auto')}
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
      <div className="mx-auto w-full max-w-3xl px-2 sm:px-4">
        {/* Rangée 1 : bouton + · logo + nom centrés · langue + notifications */}
        <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-1">
          <div className="flex items-center">
            <CreateMenu
              trigger={
                <button
                  type="button"
                  aria-label={t('nav_create')}
                  className="flex h-10 w-10 items-center justify-center rounded-full border-[1.7px] border-fg text-fg transition-transform duration-150 hover:bg-bg-secondary active:scale-90"
                >
                  <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />
                </button>
              }
            />
          </div>

          <Link href="/" className="flex items-center gap-2" aria-label="PlanB — accueil">
            <LogoMark className="h-9 w-9 sm:h-10 sm:w-10" />
            <span className="whitespace-nowrap text-[1.35rem] font-extrabold leading-none tracking-tight text-fg sm:text-2xl">
              Plan{' '}
              <span className="text-primary-600 drop-shadow-[0_1px_1px_rgba(124,58,237,0.25)]">B</span>
            </span>
          </Link>

          <div className="flex items-center justify-end gap-0.5">
            <button
              type="button"
              onClick={toggleLang}
              className="flex h-9 min-h-9 items-center justify-center rounded-full border border-border px-2 text-[11px] font-black tracking-wide text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg"
              aria-label={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
              title={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
            >
              {lang === 'fr' ? 'FR' : 'EN'}
            </button>

            {isLoading ? (
              <div className="h-9 w-9 animate-pulse-soft rounded-full bg-border" aria-hidden />
            ) : isAuthenticated ? (
              <AccountMenu unreadCount={unread?.count ?? 0} unreadMsgCount={unreadMessages?.count ?? 0} />
            ) : (
              <Button asChild size="sm" className="h-9 rounded-full px-3 text-xs">
                <Link href="/login">{t('nav_login')}</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Rangée 2 : les cinq onglets, Accueil dans sa pastille en relief */}
        <nav
          aria-label="Navigation principale"
          className="relative flex items-end justify-between gap-0.5 pb-2 pt-2"
        >
          {TABS.map((tab) =>
            'home' in tab && tab.home ? (
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
