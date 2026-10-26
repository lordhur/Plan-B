'use client'

import { CalendarDays, Compass, Home, Plus, Users, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { CreateMenu } from './Navbar'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  exact: boolean
}

const LEFT_ITEMS: NavItem[] = [
  { href: '/', label: 'Fil', icon: Home, exact: true },
  { href: '/friends', label: 'Membres', icon: Users, exact: false },
]

const RIGHT_ITEMS: NavItem[] = [
  { href: '/events/calendar', label: 'Activité', icon: CalendarDays, exact: false },
  { href: '/explore', label: 'Explorer', icon: Compass, exact: false },
]

function BottomNavLink({ href, label, icon: Icon, exact }: NavItem) {
  const pathname = usePathname()
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
      {label}
    </Link>
  )
}

/**
 * Barre de navigation mobile — même présentation que la barre du haut
 * (pastilles arrondies, état actif teinté), cibles ≥ 44 px.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur-lg md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch gap-1 p-1.5 safe-bottom">
        {LEFT_ITEMS.map((item) => (
          <BottomNavLink key={item.href} {...item} />
        ))}

        {/* + central : menu de création (plan, groupe, page) */}
        <div className="flex flex-1 items-center justify-center">
          <CreateMenu
            trigger={
              <button
                type="button"
                aria-label="Créer un plan, un groupe ou une page"
                className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-glow transition-transform active:scale-95"
              >
                <Plus className="h-6 w-6" aria-hidden />
              </button>
            }
          />
        </div>

        {RIGHT_ITEMS.map((item) => (
          <BottomNavLink key={item.href} {...item} />
        ))}
      </div>
    </nav>
  )
}
