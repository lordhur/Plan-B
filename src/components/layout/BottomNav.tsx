'use client'

import { CalendarDays, Home, Store, Users, UsersRound, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/i18n'

interface NavItem {
  href: string
  labelKey: string
  icon: LucideIcon
  exact: boolean
}

const ITEMS: NavItem[] = [
  { href: '/friends', labelKey: 'bottom_members', icon: Users, exact: false },
  { href: '/events/calendar', labelKey: 'bottom_activity', icon: CalendarDays, exact: false },
  { href: '/', labelKey: 'bottom_feed', icon: Home, exact: true },
  { href: '/groups', labelKey: 'bottom_groups', icon: UsersRound, exact: false },
  { href: '/pages', labelKey: 'bottom_pages', icon: Store, exact: false },
]

function BottomNavLink({ href, labelKey, icon: Icon, exact }: NavItem) {
  const pathname = usePathname()
  const { t } = useLang()
  const active = exact ? pathname === href : pathname.startsWith(href)
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-semibold transition-colors',
        active
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
          : 'text-fg-muted hover:bg-bg-secondary hover:text-fg',
      )}
    >
      <Icon className="h-5 w-5" aria-hidden />
      {t(labelKey)}
    </Link>
  )
}

/**
 * Barre de navigation mobile — Membres · Activité · Accueil · Groupes · Pages.
 * Pastilles arrondies, état actif teinté, cibles ≥ 44 px, jamais de zoom.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur-lg md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch gap-1 p-1.5 safe-bottom">
        {ITEMS.map((item) => (
          <BottomNavLink key={item.href} {...item} />
        ))}
      </div>
    </nav>
  )
}
