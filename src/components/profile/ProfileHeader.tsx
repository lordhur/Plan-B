'use client'

import {
  CalendarDays,
  History,
  Image as ImageIcon,
  Menu,
  Pencil,
  Plus,
  Star,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

/** Icônes de marque (tracés officiels, jamais le nom en texte). */
function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.13 1.38C1.35 2.68.94 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.67 1.34 1.08 2.13 1.38.76.3 1.64.5 2.91.56 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.67-.67 1.08-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.38-2.13C21.32 1.35 20.65.94 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.41a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"
      />
    </svg>
  )
}

function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
      />
    </svg>
  )
}

function YoutubeGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.6V8.4L15.8 12l-6.3 3.6z"
      />
    </svg>
  )
}

function SpotifyGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14C9.6 9.9 15 10.56 18.72 12.84c.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z"
      />
    </svg>
  )
}

type Social = {
  key: 'instagram' | 'tiktok' | 'youtube' | 'spotify'
  label: string
  value: string | null
  href: string
  glyph: (p: { className?: string }) => React.JSX.Element
  className: string
}

/** Transforme un pseudo (ou une URL) en lien ouvrable. */
function socialHref(key: Social['key'], raw: string): string {
  const value = raw.trim()
  if (/^https?:\/\//i.test(value)) return value
  const handle = value.replace(/^@/, '').replace(/\s+/g, '')
  switch (key) {
    case 'instagram':
      return `https://instagram.com/${handle}`
    case 'tiktok':
      return `https://tiktok.com/@${handle}`
    case 'youtube':
      return `https://youtube.com/@${handle}`
    case 'spotify':
      return `https://open.spotify.com/search/${encodeURIComponent(handle)}`
  }
}

export type ProfileTab = 'photos' | 'events' | 'memories' | 'social'

export interface ProfileHeaderUser {
  displayName: string | null
  firstName: string
  lastName: string
  showLastName: boolean
  coverImage: string | null
  avatarUrl: string | null
  friendCount: number
  averageRating: number
  totalRatings: number
  bio: string | null
  instagram: string | null
  tiktok: string | null
  youtube: string | null
  spotify: string | null
}

/** Les quatre réseaux du profil (icônes de marque, lien externe si renseigné). */
export function SocialLinks({
  instagram,
  tiktok,
  youtube,
  spotify,
  editable = true,
}: {
  instagram: string | null
  tiktok: string | null
  youtube: string | null
  spotify: string | null
  editable?: boolean
}) {
  const socials: Social[] = [
    {
      key: 'instagram',
      label: 'Instagram',
      value: instagram,
      href: socialHref('instagram', instagram ?? ''),
      glyph: InstagramGlyph,
      className: 'bg-[linear-gradient(45deg,#f9ce34,#ee2a7b_45%,#6228d7)] text-white',
    },
    {
      key: 'tiktok',
      label: 'TikTok',
      value: tiktok,
      href: socialHref('tiktok', tiktok ?? ''),
      glyph: TikTokGlyph,
      className: 'bg-[#010101] text-white',
    },
    {
      key: 'youtube',
      label: 'YouTube',
      value: youtube,
      href: socialHref('youtube', youtube ?? ''),
      glyph: YoutubeGlyph,
      className: 'bg-[#ff0000] text-white',
    },
    {
      key: 'spotify',
      label: 'Spotify',
      value: spotify,
      href: socialHref('spotify', spotify ?? ''),
      glyph: SpotifyGlyph,
      className: 'bg-[#1db954] text-black',
    },
  ]

  const shown = editable ? socials : socials.filter((s) => s.value)
  if (shown.length === 0) return null

  return (
    <ul className="mt-4 flex items-center gap-3 px-4 md:px-2" aria-label="Réseaux sociaux">
      {shown.map(({ key, label, value, href, glyph: Glyph, className }) => {
        const active = Boolean(value)
        const inner = (
          <span
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full transition-transform',
              active
                ? className
                : 'border border-dashed border-border bg-bg-secondary text-fg-muted',
            )}
          >
            <Glyph className="h-5 w-5" />
          </span>
        )
        return (
          <li key={key}>
            {active ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer me"
                aria-label={`${label} (nouvel onglet)`}
                className="block transition-transform hover:scale-105"
              >
                {inner}
              </a>
            ) : (
              <Link
                href="/profile/edit"
                aria-label={`Ajouter mon ${label}`}
                title={`Ajouter mon ${label}`}
                className="block opacity-60 transition-opacity hover:opacity-100"
              >
                {inner}
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * EN-TÊTE DE PROFIL — photo de couverture plein écran importable, avatar à
 * anneau dégradé qui chevauche la couverture (badge « + »), pseudo, amis,
 * note, bio, quatre réseaux et quatre tuiles de contenu.
 */
export function ProfileHeader({
  user,
  activeTab,
  onTabChange,
}: {
  user: ProfileHeaderUser
  activeTab: ProfileTab
  onTabChange: (tab: ProfileTab) => void
}) {
  const name = user.displayName || `${user.firstName} ${user.lastName}`

  const tiles: { key: ProfileTab; label: string; icon: typeof ImageIcon }[] = [
    { key: 'photos', label: 'Photos', icon: ImageIcon },
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

          {/* Stylo + menu, posés sur la couverture */}
          <div className="absolute right-3 top-3 flex items-center gap-1">
            <Link
              href="/profile/edit"
              aria-label="Modifier le profil"
              className="flex h-11 w-11 items-center justify-center rounded-full text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] transition-colors hover:bg-black/20"
            >
              <Pencil className="h-6 w-6" strokeWidth={1.9} aria-hidden />
            </Link>
            <Link
              href="/profile/settings"
              aria-label="Paramètres du profil"
              className="flex h-11 w-11 items-center justify-center rounded-full text-white/95 drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] transition-colors hover:bg-black/20"
            >
              <Menu className="h-6 w-6" strokeWidth={2.2} aria-hidden />
            </Link>
          </div>
        </div>

        {/* 2. Avatar à anneau dégradé, chevauchant la couverture */}
        <div className="flex items-center gap-4 px-4 pt-0 md:px-2">
          <span className="relative -mt-[54px] shrink-0 rounded-full bg-gradient-to-tr from-accent-500 via-danger-500 to-secondary-600 p-[3px] shadow-lg md:-mt-[58px]">
            <Avatar
              src={user.avatarUrl}
              name={name}
              className="h-[86px] w-[86px] border-[3px] border-bg md:h-[96px] md:w-[96px]"
            />
            <Link
              href="/profile/edit"
              aria-label="Ajouter une photo de profil"
              className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-accent-600 text-white ring-[3px] ring-bg transition-transform active:scale-90"
            >
              <Plus className="h-4 w-4" strokeWidth={3} aria-hidden />
            </Link>
          </span>

          <div className="min-w-0 flex-1 pb-1 pt-2">
            <h1 className="truncate text-[1.6rem] font-extrabold leading-tight tracking-tight md:text-3xl">
              {name}
            </h1>
            <div className="mt-1.5 flex items-center gap-3 text-[15px]">
              <Link href="/friends" className="flex items-center gap-1.5 hover:underline">
                <Users className="h-5 w-5 text-fg" strokeWidth={1.9} aria-hidden />
                <span className="font-bold">{user.friendCount}</span>
                <span className="text-fg-muted">Amis</span>
              </Link>
              <span aria-hidden className="h-6 w-px bg-border" />
              <span className="flex items-center gap-1.5" title={`${user.totalRatings} avis`}>
                <Star className="h-5 w-5 fill-accent-500 text-accent-500" aria-hidden />
                <span className="font-bold">{user.averageRating.toFixed(1).replace('.', ',')}</span>
                <span className="sr-only">étoiles sur 5</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bio */}
      {user.bio && (
        <p className="mt-3 whitespace-pre-line px-4 text-[15px] leading-snug text-fg md:px-2">
          {user.bio}
        </p>
      )}

      {/* 4. Réseaux sociaux */}
      <SocialLinks
        instagram={user.instagram}
        tiktok={user.tiktok}
        youtube={user.youtube}
        spotify={user.spotify}
      />

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
