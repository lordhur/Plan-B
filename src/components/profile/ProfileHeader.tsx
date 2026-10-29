'use client'

import { CalendarDays, History, Images, Link2, Plus, Star, Users } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  type ProfileLink,
  detectBrand,
  linkLabel,
  SOCIAL_LABELS,
  socialHref,
} from '@/lib/socialLinks'

import { AccountMenu } from '@/components/layout/AccountMenu'
import { SOCIAL_BADGE_CLASS, SocialGlyph } from './SocialGlyphs'

/* ============================================================
   Liens du profil : marques et liens libres
   ============================================================ */

/**
 * Pastilles de liens, DANS L'ORDRE CHOISI PAR L'UTILISATEUR (profil → modifier).
 * On n'affiche QUE les liens réellement renseignés : aucune icône grisée quand
 * le compte n'a pas encore de lien.
 */
export function SocialLinks({ links }: { links: ProfileLink[] }) {
  const active = links.filter((link) => link.url.trim().length > 0)
  if (active.length === 0) return null

  return (
    <ul className="flex flex-wrap items-center gap-3" aria-label="Liens et réseaux sociaux">
      {active.map((link, index) => {
        const label = linkLabel(link)
        return (
          <li key={`${link.type}-${index}`}>
            <a
              href={socialHref(link.type, link.url)}
              target="_blank"
              rel="noopener noreferrer me"
              aria-label={`${label} (nouvel onglet)`}
              title={label}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-105',
                SOCIAL_BADGE_CLASS[link.type],
              )}
            >
              <SocialGlyph type={link.type} className="h-5 w-5" />
            </a>
          </li>
        )
      })}
    </ul>
  )
}

const URL_RE =
  /((?:https?:\/\/|www\.)[^\s<>"']+|(?:[a-z0-9-]+\.)+(?:fr|com|net|org|io|co|app|be|ch|me)(?:\/[^\s<>"']*)?)/gi

/** Extrait les liens présents dans une description. */
export function extractLinks(text: string | null): string[] {
  if (!text) return []
  const found = text.match(URL_RE) ?? []
  return Array.from(new Set(found.map((u) => (u.startsWith('http') ? u : `https://${u}`))))
}

/** Description avec liens cliquables (réseaux reconnus = pastille de marque). */
function RichBio({ text }: { text: string }) {
  const parts = text.split(URL_RE)
  return (
    <p className="whitespace-pre-line text-[15px] leading-snug text-fg">
      {parts.map((part, index) => {
        if (!part) return null
        if (!URL_RE.test(part)) return <React.Fragment key={index}>{part}</React.Fragment>
        URL_RE.lastIndex = 0
        const href = part.startsWith('http') ? part : `https://${part}`
        const brand = detectBrand(href)
        if (brand) {
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer me"
              className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-bg-secondary px-1.5 py-0.5 align-baseline font-semibold text-fg hover:text-accent-600"
            >
              <SocialGlyph type={brand} className="h-3.5 w-3.5" />
              {SOCIAL_LABELS[brand]}
            </a>
          )
        }
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-0.5 inline-flex items-center gap-0.5 align-baseline font-semibold text-accent-600 underline decoration-accent-500/40 underline-offset-2 hover:decoration-accent-500"
          >
            <Link2 className="h-3.5 w-3.5" aria-hidden />
            {part.replace(/^https?:\/\//, '').replace(/\/$/, '')}
          </a>
        )
      })}
    </p>
  )
}

/* ============================================================
   En-tête de profil
   ============================================================ */

export type ProfileTab = 'media' | 'events' | 'memories' | 'social'

export interface ProfileHeaderUser {
  displayName: string | null
  firstName: string
  lastName: string
  showLastName: boolean
  coverImage: string | null
  avatarUrl: string | null
  friendCount: number
  /** Participations à des plans (plans rejoints). */
  eventsAttended: number
  /** Plans organisés. */
  eventsCreated: number
  averageRating: number
  totalRatings: number
  bio: string | null
  /** Liens du profil, déjà triés dans l'ordre d'affichage. */
  links: ProfileLink[]
}

export function ProfileHeader({
  user,
  activeTab,
  onTabChange,
  hasStory,
  unreadCount,
}: {
  user: ProfileHeaderUser
  activeTab: ProfileTab
  onTabChange: (tab: ProfileTab) => void
  /** Une story est-elle disponible ? Sinon, l'avatar n'a pas d'anneau. */
  hasStory: boolean
  unreadCount?: number
}) {
  const name = user.displayName || `${user.firstName} ${user.lastName}`

  const tiles: { key: ProfileTab; label: string; icon: typeof Images }[] = [
    { key: 'media', label: 'Média', icon: Images },
    { key: 'events', label: 'Evenements', icon: CalendarDays },
    { key: 'memories', label: 'Souvenirs', icon: History },
    { key: 'social', label: 'Social', icon: Users },
  ]

  return (
    <div>
      {/* 1. Couverture plein écran (bord à bord sur mobile) */}
      <div className="relative -mx-4 md:mx-0">
        <div className="relative h-40 w-full overflow-hidden rounded-b-[1.75rem] bg-gradient-to-br from-primary-600 to-accent-600 sm:h-52 md:rounded-2xl">
          {user.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.coverImage}
              alt="Photo de couverture"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-end justify-start p-4">
              <span className="text-xs font-semibold text-white/85">
                Ajoutez une photo de couverture
              </span>
            </div>
          )}

          {/* Menu « trois tirets » + réglages, posés sur la couverture */}
          <div className="absolute right-2 top-2 flex items-center gap-1">
            <Link
              href="/profile/edit"
              aria-label="Modifier le profil"
              className="flex h-11 w-11 items-center justify-center rounded-full text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] transition-colors hover:bg-black/20"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden focusable="false">
                <path
                  d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <AccountMenu
              unreadCount={unreadCount}
              trigger={
                <button
                  type="button"
                  aria-label="Menu du compte"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] transition-colors hover:bg-black/20"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden focusable="false">
                    <path
                      d="M4 7h16M4 12h16M4 17h16"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </button>
              }
            />
          </div>
        </div>

        {/* 2. Avatar — anneau dégradé UNIQUEMENT si une story est disponible */}
        <div className="flex items-center gap-4 px-4 pt-0 md:px-2">
          <span
            className={cn(
              'relative -mt-[54px] shrink-0 rounded-full p-[3px] shadow-lg md:-mt-[58px]',
              hasStory ? 'story-ring' : 'story-ring-muted',
            )}
          >
            <Avatar
              src={user.avatarUrl}
              name={name}
              className={cn(
                'h-[86px] w-[86px] md:h-[96px] md:w-[96px]',
                hasStory ? 'border-[3px] border-bg' : 'ring-[3px] ring-border',
              )}
            />
            <Link
              href="/stories/new"
              aria-label="Ajouter une story"
              title="Ajouter une story"
              className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-accent-600 text-white ring-[3px] ring-bg transition-transform active:scale-90"
            >
              <Plus className="h-4 w-4" strokeWidth={3} aria-hidden />
            </Link>
          </span>

          <div className="min-w-0 flex-1 pb-1 pt-2">
            <h1 className="truncate text-[1.6rem] font-extrabold leading-tight tracking-tight md:text-3xl">
              {name}
            </h1>

            {/* Amis · Participations · Organisés · Note */}
            <dl className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" strokeWidth={1.9} aria-hidden />
                <dd className="font-bold">{user.friendCount}</dd>
                <dt className="text-fg-muted">Amis</dt>
              </div>
              <span aria-hidden className="h-5 w-px bg-border" />
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" strokeWidth={1.9} aria-hidden />
                <dd className="font-bold">{user.eventsAttended}</dd>
                <dt className="text-fg-muted">Participations</dt>
              </div>
              <span aria-hidden className="h-5 w-px bg-border" />
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-secondary-500 text-secondary-500" aria-hidden />
                <dd className="font-bold">{user.eventsCreated}</dd>
                <dt className="text-fg-muted">Organisés</dt>
              </div>
              <span aria-hidden className="h-5 w-px bg-border" />
              <div className="flex items-center gap-1" title={`${user.totalRatings} avis`}>
                <Star className="h-4 w-4 fill-accent-500 text-accent-500" aria-hidden />
                <dd className="font-bold">{user.averageRating.toFixed(1).replace('.', ',')}</dd>
                <dt className="sr-only">note sur 5</dt>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* 3. Description (liens cliquables) */}
      {user.bio && (
        <div className="mt-3 px-4 md:px-2">
          <RichBio text={user.bio} />
        </div>
      )}

      {/* 4. Réseaux et liens — AUTANT de logos que de liens renseignés */}
      {user.links.length > 0 && (
        <div className="mt-4 px-4 md:px-2">
          <SocialLinks links={user.links} />
        </div>
      )}

      {/* 5. Tuiles de contenu */}
      <div
        role="tablist"
        aria-label="Contenu du profil"
        className="scrollbar-none mt-4 flex gap-2.5 overflow-x-auto px-4 pb-1 md:px-2"
      >
        {tiles.map(({ key, label, icon: Icon }) => {
          const active = key === activeTab
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(key)}
              className={cn(
                'flex min-h-[4.75rem] min-w-[4.75rem] flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 transition-colors',
                active
                  ? 'border-accent-500/70 bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300'
                  : 'border-border bg-card text-fg hover:border-accent-500/50 hover:text-accent-600',
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={1.8} aria-hidden />
              <span className="text-[11px] font-semibold leading-tight">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
