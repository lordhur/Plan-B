'use client'

import { Bell, LogOut, Plus, Settings, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
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

/** Barre de navigation principale (header fixe). */
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

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo />

        <div className="flex items-center gap-1.5">
          <Button asChild variant="accent" size="sm" className="hidden sm:inline-flex">
            <Link href="/events/create">
              <Plus className="h-4 w-4" aria-hidden /> Créer un plan
            </Link>
          </Button>

          <ThemeToggle />

          {isLoading ? (
            <div className="h-9 w-9 animate-pulse-soft rounded-full bg-border" aria-hidden />
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-1.5">
              <Link
                href="/notifications"
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
              >
                <Bell className="h-5 w-5" aria-hidden />
                {unreadCount > 0 && (
                  <span
                    aria-hidden
                    className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

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
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {user.firstName} {user.lastName}
                  </DropdownMenuLabel>
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
                  <DropdownMenuItem
                    onClick={() => logout.mutate()}
                    className="text-danger-500 focus:text-danger-600"
                  >
                    <LogOut className="h-4 w-4" aria-hidden /> Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
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
