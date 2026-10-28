'use client'

import {
  Bell,
  Camera,
  CalendarDays,
  CalendarHeart,
  CalendarPlus,
  HelpCircle,
  LogOut,
  Mail,
  MessageCircle,
  Plus,
  Settings,
  Store,
  User as UserIcon,
  Users,
  UsersRound,
  Home,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { cn } from '@/lib/utils'
import { Logo, LogoMark } from '@/components/common/Logo'
import { ThemeToggle } from './ThemeToggle'
import { useLang } from '@/lib/i18n'
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

/** Navigation principale — bloc unique centré autour du fil d'actualité. */
const NAV_LINKS = [
  { href: '/friends', labelKey: 'nav_members', icon: Users, centered: false },
  { href: '/events/calendar', labelKey: 'nav_activity', icon: CalendarDays, centered: false },
  { href: '/', labelKey: 'nav_feed', icon: Home, centered: true },
  { href: '/groups', labelKey: 'nav_groups', icon: UsersRound, centered: false },
  { href: '/pages', labelKey: 'nav_pages', icon: Store, centered: false },
]

function NavLink({
  href,
  labelKey,
  icon: Icon,
  centered,
}: {
  href: string
  labelKey: string
  icon: typeof Home
  centered?: boolean
}) {
  const pathname = usePathname()
  const { t } = useLang()
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
        centered && 'text-base',
        active
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
          : 'text-fg-muted hover:bg-bg-secondary hover:text-fg',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className={cn(centered && 'font-extrabold')}>{t(labelKey)}</span>
    </Link>
  )
}

/** Menu « Créer » — nouveau plan, groupe ou page, sous le bouton +. */
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

/** Barre de navigation principale : bloc d'onglets centré, actions à droite. */
export function Navbar() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useCurrentUser()
  const { lang, toggle: toggleLang, t } = useLang()
  const utils = trpc.useUtils()
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, undefined as never)
      router.push('/login')
      router.refresh()
    },
  })

  const { data: unread } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  })
  const unreadCount = unread?.count ?? 0
  const { data: unreadMessages } = trpc.messages.totalUnread.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  })
  const unreadMsgCount = unreadMessages?.count ?? 0

  // La barre est FIXE : on publie sa hauteur réelle dans `--nav-h` pour que
  // le contenu (et la messagerie plein écran) démarre juste en dessous.
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
      className="fixed inset-x-0 top-0 z-50 border-b border-border bg-bg/85 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-lg supports-[backdrop-filter]:bg-bg/75"
    >
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-1 px-4 pb-1.5 pt-2 md:pb-2">
        {/* Haut : bouton rond « + » puis logo + Plan B à sa droite · actions à droite */}
        <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2">
          <div className="flex items-center gap-2.5">
            <CreateMenu
              trigger={
                <Button
                  variant="accent"
                  size="icon"
                  className="rounded-full shadow-md"
                  aria-label={t('nav_create')}
                >
                  <Plus className="h-5 w-5" aria-hidden />
                </Button>
              }
            />

            <Link href="/" className="flex items-center gap-2" aria-label="PlanB — accueil">
              <LogoMark className="h-11 w-11 sm:h-12 sm:w-12" />
              <span className="text-xl font-black tracking-tight text-fg sm:text-2xl">
                Plan<span className="text-primary-600">B</span>
              </span>
            </Link>
          </div>

          <span aria-hidden />

          <div className="flex items-center gap-1.5">

          <ThemeToggle />

          <button
            type="button"
            onClick={toggleLang}
            className="inline-flex h-9 min-h-9 w-9 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            aria-label={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
            title={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
          >
            <span className="text-sm font-black">{lang === 'fr' ? 'EN' : 'FR'}</span>
          </button>

          {isLoading ? (
            <div className="h-9 w-9 animate-pulse-soft rounded-full bg-border" aria-hidden />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="rounded-full transition-opacity hover:opacity-80"
                  aria-label="Menu du profil"
                >
                  <Avatar
                    src={user.avatarUrl}
                    name={user.displayName || `${user.firstName} ${user.lastName}`}
                    size="sm"
                    className="h-9 w-9"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                alignOffset={-6}
                sideOffset={8}
                avoidCollisions={false}
                className="z-[70] max-h-[min(72vh,32rem)] w-60 overflow-y-auto overscroll-contain"
              >
                <DropdownMenuLabel>
                  {user.firstName} {user.lastName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
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
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserIcon className="h-4 w-4" aria-hidden /> {t('nav_profile')}
                  </Link>
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
          ) : (
            <div className="hidden items-center gap-1.5 sm:flex">
              <Link
                href="/contact"
                aria-label={t('nav_contact')}
                className="hidden h-9 w-9 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg sm:inline-flex"
              >
                <Mail className="h-4.5 w-4.5" aria-hidden />
              </Link>
              <Button asChild variant="ghost" size="sm" className="h-9 px-4 text-sm">
                <Link href="/login">{t('nav_login')}</Link>
              </Button>
              <Button asChild size="sm" className="h-9 px-4 text-sm">
                <Link href="/register">{t('nav_register')}</Link>
              </Button>
            </div>
          )}
          </div>
        </div>

        {/* Mobile (invité) : Connexion + Inscription sur toute la largeur de l'écran */}
        {!isLoading && !isAuthenticated && (
          <div className="grid w-full grid-cols-2 gap-2 pb-1 sm:hidden">
            <Button asChild variant="outline" className="h-10 w-full px-2 text-xs">
              <Link href="/login">{t('nav_login')}</Link>
            </Button>
            <Button asChild className="h-10 w-full px-2 text-xs">
              <Link href="/register">{t('nav_register')}</Link>
            </Button>
          </div>
        )}

        {/* Bas : tous les onglets regroupés et centrés, sous le logo */}
        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-0.5 rounded-2xl border border-border bg-card/70 p-1 md:flex"
        >
          {NAV_LINKS.map((l) => (
            <NavLink key={l.href} {...l} />
          ))}
        </nav>
      </div>
    </header>
  )
}
