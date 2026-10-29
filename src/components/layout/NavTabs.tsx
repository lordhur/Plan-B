'use client'

import {
  CalendarDays,
  Home,
  MessageCircle,
  User as UserIcon,
  Users,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

import { useLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Les cinq onglets de la navigation principale, partagés haut (site) / bas (mobile). */
export const NAV_TABS: { href: string; labelKey: string; icon?: LucideIcon; home?: boolean }[] = [
  { href: '/community', labelKey: 'nav_community', icon: Users },
  { href: '/events/calendar', labelKey: 'nav_activity', icon: CalendarDays },
  { href: '/', labelKey: 'nav_feed', home: true },
  { href: '/messages', labelKey: 'nav_message', icon: MessageCircle },
  { href: '/profile', labelKey: 'nav_profile_tab', icon: UserIcon },
]

/** Maison pleine, porte évidée — dessin de la maquette. */
export function HouseIcon({ className }: { className?: string }) {
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

function useActive(href: string) {
  const pathname = usePathname() ?? '/'
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Onglet standard (hors Accueil). */
function TabLink({
  href,
  label,
  icon: Icon,
  badge,
}: {
  href: string
  label: string
  icon: LucideIcon
  badge?: number
}) {
  const active = useActive(href)
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="nav-tab group flex min-h-[3.25rem] flex-1 flex-col items-center justify-end gap-2 rounded-xl px-0.5 pb-0.5 transition-colors"
    >
      <span className="relative">
        <Icon
          className={cn(
            'nav-tab-glyph h-[21px] w-[21px] transition-transform duration-200 group-active:scale-90',
            !active && 'text-fg/85',
          )}
          strokeWidth={active ? 2.1 : 1.9}
          aria-hidden
        />
        {badge ? (
          <span
            aria-label={`${badge} message${badge > 1 ? 's' : ''} non lu${badge > 1 ? 's' : ''}`}
            className="absolute -right-2.5 -top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-danger-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-bg"
          >
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          'nav-tab-glyph nav-tab-label max-w-full truncate text-[10px] leading-none tracking-tight sm:text-[11px]',
          active ? 'font-bold' : 'font-medium text-fg/85',
        )}
      >
        {label}
      </span>
    </Link>
  )
}

/**
 * Onglet Accueil — DOUBLE cercle blanc en relief (anneau extérieur + pastille
 * intérieure) portant l'icône ET le libellé, avec l'animation de « clic ».
 * `raised` = barre du bas : le cercle est posé en absolu et dépasse au-dessus
 * du filet, exactement comme sur la maquette.
 */
function HomeTab({ label, raised }: { label: string; raised?: boolean }) {
  const active = useActive('/')
  const [tap, setTap] = React.useState(0)

  const pill = (
    <span
      key={tap}
      className={cn(
        'home-pill relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full min-[380px]:h-[4.25rem] min-[380px]:w-[4.25rem]',
        'transition-transform duration-150 group-active:scale-95',
        !raised && '-mb-3',
        tap > 0 && 'animate-home-tap',
      )}
    >
      {tap > 0 && (
        <span
          aria-hidden
          className="animate-home-ring pointer-events-none absolute inset-0 rounded-full"
        />
      )}
      <span className="home-pill-inner relative flex h-[3.375rem] w-[3.375rem] flex-col items-center justify-center gap-[3px] rounded-full min-[380px]:h-[3.5rem] min-[380px]:w-[3.5rem]">
        <HouseIcon
          className={cn(
            'nav-home-glyph h-[21px] w-[21px] transition-colors duration-200',
            !active && 'text-fg/70',
          )}
        />
        <span
          className={cn(
            'nav-home-glyph nav-home-label max-w-full truncate px-1 text-[10px] leading-none tracking-tight sm:text-[11px]',
            active ? 'font-bold' : 'font-medium text-fg/85',
          )}
        >
          {label}
        </span>
      </span>
    </span>
  )

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
      className={cn(
        'nav-home group relative z-10 flex flex-1 flex-col items-center justify-end',
        raised && 'min-h-[3.25rem]',
      )}
    >
      {/* Aura orange : halo en dégradé qui se dégage du bouton au survol */}
      <span aria-hidden className="home-aura" />

      {raised ? (
        <span className="absolute bottom-[6px] left-1/2 -translate-x-1/2">{pill}</span>
      ) : (
        <span className="relative">{pill}</span>
      )}
    </Link>
  )
}

/**
 * Les cinq onglets, dans l'ordre de la maquette. Utilisé tel quel par la barre
 * du haut (site) et par la barre du bas (mobile) : même style, mêmes couleurs,
 * mêmes animations.
 */
export function NavTabs({
  raised = false,
  unreadMessages = 0,
}: {
  raised?: boolean
  unreadMessages?: number
}) {
  const { t } = useLang()
  return (
    <>
      {NAV_TABS.map((tab) =>
        tab.home || !tab.icon ? (
          <HomeTab key={tab.href} label={t(tab.labelKey)} raised={raised} />
        ) : (
          <TabLink
            key={tab.href}
            href={tab.href}
            label={t(tab.labelKey)}
            icon={tab.icon}
            badge={tab.href === '/messages' ? unreadMessages : 0}
          />
        ),
      )}
    </>
  )
}
