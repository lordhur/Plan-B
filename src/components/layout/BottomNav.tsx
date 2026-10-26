'use client'

import { CalendarDays, Compass, Home, Plus, Users, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  exact: boolean
  accent?: boolean
}

const ITEMS: NavItem[] = [
  { href: '/', label: 'Fil', icon: Home, exact: true },
  { href: '/friends', label: 'Membres', icon: Users, exact: false },
  { href: '/events/create', label: 'Créer', icon: Plus, exact: false, accent: true },
  { href: '/events/calendar', label: 'Calendrier', icon: CalendarDays, exact: false },
  { href: '/explore', label: 'Explorer', icon: Compass, exact: false },
]

/** Barre de navigation mobile (bas d'écran, cibles ≥ 44 px). */
export function BottomNav() {
  const pathname = usePathname()
  const { isAuthenticated } = useCurrentUser()
  const { data: unread } = trpc.messages.totalUnread.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  })

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur-lg md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around safe-bottom">
        {ITEMS.map(({ href, label, icon: Icon, exact, accent }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          if (accent) {
            return (
              <li key={href} className="flex items-center">
                <Link
                  href={href}
                  aria-label={label}
                  className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-glow transition-transform active:scale-95"
                >
                  <Icon className="h-6 w-6" aria-hidden />
                </Link>
              </li>
            )
          }
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                  active ? 'text-primary-600' : 'text-fg-muted',
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden />
                  {href === '/messages' && (unread?.count ?? 0) > 0 && (
                    <span
                      aria-hidden
                      className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[9px] font-bold text-white"
                    >
                      {unread!.count > 9 ? '9+' : unread!.count}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
