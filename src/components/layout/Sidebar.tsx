'use client'

import {
  CalendarDays,
  Compass,
  Home,
  Store,
  UsersRound,
  Plus,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Button } from '@/components/ui/button'

interface NavEntry {
  href: string
  label: string
  icon: LucideIcon
  badge?: boolean
}

const NAV: NavEntry[] = [
  { href: '/', label: 'Fil d’actualité', icon: Home },
  { href: '/explore', label: 'Explorer', icon: Compass },
  { href: '/events/calendar', label: 'Activité', icon: CalendarDays },
  { href: '/friends', label: 'Les Membres', icon: Users },
  { href: '/groups', label: 'Groupes', icon: UsersRound },
  { href: '/pages', label: 'Pages', icon: Store },
  { href: '/leaderboard', label: 'Classements', icon: Trophy },
]

/** Barre latérale desktop. */
export function Sidebar() {
  const pathname = usePathname()
  const { isAuthenticated } = useCurrentUser()
  const { data: unread } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60_000,
  })
  const { data: unreadMessages } = trpc.messages.totalUnread.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  })

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border p-4 md:flex">
      <Button asChild className="mb-4 w-full">
        <Link href="/events/create">
          <Plus className="h-4 w-4" aria-hidden /> Créer un plan
        </Link>
      </Button>

      <nav aria-label="Navigation principale">
        <ul className="space-y-0.5">
          {NAV.map(({ href, label, icon: Icon, badge }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                      : 'text-fg-muted hover:bg-bg-secondary hover:text-fg',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {label}
                        </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="mt-auto rounded-xl bg-gradient-to-br from-primary-600 to-secondary-600 p-4 text-white">
        <p className="text-sm font-bold">Le futur, c’est maintenant 🚀</p>
        <p className="mt-1 text-xs text-white/80">
          Ne postez plus ce que vous avez fait. Postez ce que vous allez faire.
        </p>
      </div>
    </aside>
  )
}
