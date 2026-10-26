'use client'

import {
  Bell,
  CalendarDays,
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
  { href: '/friends', label: 'Les Membres', icon: Users, centered: false },
  { href: '/events/calendar', label: 'Calendrier', icon: CalendarDays, centered: false },
  { href: '/', label: 'Fil d’actualité', icon: Home, centered: true },
  { href: '/groups', label: 'Groupes', icon: UsersRound, centered: false },
  { href: '/pages', label: 'Pages', icon: Store, centered: false },
]

function NavLink({
  href,
  label,
  icon: Icon,
  centered,
}: {
  href: string
  label: string
  icon: typeof Home
  centered?: boolean
}) {
  const pathname = usePathname()
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-semibold transition-colors xl:px-3',
        centered && 'text-base',
        active
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
          : 'text-fg-muted hover:bg-bg-secondary hover:text-fg',
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className={cn('hidden xl:inline', centered && 'font-extrabold')}>{label}</span>
    </Link>
  )
}

/** Menu « Créer » — nouveau plan, groupe ou page, sous le bouton +. */
export function CreateMenu({ trigger }: { trigger: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-48">
        <DropdownMenuLabel>Créer…</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/events/create">
            <CalendarPlus className="h-4 w-4" aria-hidden /> Un plan
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/groups/new">
            <UsersRound className="h-4 w-4" aria-hidden /> Un groupe
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/pages/new">
            <Store className="h-4 w-4" aria-hidden /> Une page
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
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
        {/* Gauche : logo */}
        <Logo />

        {/* Centre : tous les onglets regroupés et centrés */}
        <nav
          aria-label="Navigation principale"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 rounded-2xl border border-border bg-card/70 p-1 md:flex"
        >
          {NAV_LINKS.map((l) => (
            <NavLink key={l.href} {...l} />
          ))}
        </nav>

        {/* Droite : création + thème + profil */}
        <div className="ml-auto flex items-center gap-1.5">
          <CreateMenu
            trigger={
              <Button variant="accent" size="sm" className="hidden sm:inline-flex">
                <Plus className="h-4 w-4" aria-hidden />
                <span className="hidden lg:inline">Créer</span>
              </Button>
            }
          />

          <ThemeToggle />

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
                    <MessageCircle className="h-4 w-4" aria-hidden /> Messages
                    {unreadMsgCount > 0 && (
                      <span className="ml-auto rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/notifications">
                    <Bell className="h-4 w-4" aria-hidden /> Notifications
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
                    <UserIcon className="h-4 w-4" aria-hidden /> Mon profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile/settings">
                    <Settings className="h-4 w-4" aria-hidden /> Paramètres
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/contact">
                    <HelpCircle className="h-4 w-4" aria-hidden /> Contactez-nous
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => logout.mutate()}
                  className="text-danger-500 focus:text-danger-600"
                >
                  <LogOut className="h-4 w-4" aria-hidden /> Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/contact"
                aria-label="Contactez-nous"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg"
              >
                <Mail className="h-5 w-5" aria-hidden />
              </Link>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Connexion</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Inscription</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
