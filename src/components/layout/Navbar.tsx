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
import { usePathname, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/common/Logo'
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
      <DropdownMenuContent align="start" className="min-w-52">
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

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-lg">
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-1 px-4 pb-1.5 pt-2 md:pb-2">
        {/* Haut : bouton rond « + » à gauche · logo + Plan B au centre · actions à droite */}
        <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2">
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

          <Link
            href="/"
            className="mx-auto flex items-center gap-2"
            aria-label="PlanB — accueil"
          >
            <Logo withText={false} />
            <span className="text-lg font-black tracking-tight text-fg sm:text-xl">
              Plan<span className="text-primary-600">B</span>
            </span>
          </Link>

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
              <DropdownMenuContent align="end" className="min-w-56">
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
            <div className="flex items-center gap-1.5">
              <Link
                href="/contact"
                aria-label={t('nav_contact')}
                className="hidden h-9 w-9 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg sm:inline-flex"
              >
                <Mail className="h-4.5 w-4.5" aria-hidden />
              </Link>
              <Button asChild variant="ghost" size="sm" className="h-9 px-2.5 text-xs sm:px-4 sm:text-sm">
                <Link href="/login">{t('nav_login')}</Link>
              </Button>
              <Button asChild size="sm" className="h-9 px-2.5 text-xs sm:px-4 sm:text-sm">
                <Link href="/register">{t('nav_register')}</Link>
              </Button>
            </div>
          )}
          </div>
        </div>

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
