'use client'

import { CalendarDays, History, Images, Link2, Plus, Star, Users } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

import { AccountMenu } from '@/components/layout/AccountMenu'

/* ============================================================
   Icônes de marque (tracés officiels, jamais le nom en texte)
   ============================================================ */

export function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.31-1.46.72-2.13 1.38C1.35 2.68.94 3.35.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.38 2.13.67.67 1.34 1.08 2.13 1.38.76.3 1.64.5 2.91.56 1.28.06 1.69.07 4.95.07s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.67-.67 1.08-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.31-.79-.72-1.46-1.38-2.13C21.32 1.35 20.65.94 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.41a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"
      />
    </svg>
  )
}

export function TikTokGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"
      />
    </svg>
  )
}

export function YoutubeGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.6V8.4L15.8 12l-6.3 3.6z"
      />
    </svg>
  )
}

export function SpotifyGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14C9.6 9.9 15 10.56 18.72 12.84c.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z"
      />
    </svg>
  )
}

/** Reconnaît un réseau à partir d'une URL ou d'un pseudo. */
export type SocialKey = 'instagram' | 'tiktok' | 'youtube' | 'spotify'

const BRANDS: Record<
  SocialKey,
  { label: string; glyph: (p: { className?: string }) => React.JSX.Element; className: string }
> = {
  instagram: {
    label: 'Instagram',
    glyph: InstagramGlyph,
    className: 'bg-[linear-gradient(45deg,#f9ce34,#ee2a7b_45%,#6228d7)] text-white',
  },
  tiktok: { label: 'TikTok', glyph: TikTokGlyph, className: 'bg-[#010101] text-white' },
  youtube: { label: 'YouTube', glyph: YoutubeGlyph, className: 'bg-[#ff0000] text-white' },
  spotify: { label: 'Spotify', glyph: SpotifyGlyph, className: 'bg-[#1db954] text-black' },
}

export function detectBrand(url: string): SocialKey | null {
  const value = url.toLowerCase()
  if (value.includes('instagram.com')) return 'instagram'
  if (value.includes('tiktok.com')) return 'tiktok'
  if (value.includes('youtube.com') || value.includes('youtu.be')) return 'youtube'
  if (value.includes('spotify.com')) return 'spotify'
  return null
}

/** Transforme un pseudo (ou une URL) en lien ouvrable. */
export function socialHref(key: SocialKey, raw: string): string {
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
          const { label, glyph: Glyph } = BRANDS[brand]
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer me"
              className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-bg-secondary px-1.5 py-0.5 align-baseline font-semibold text-fg hover:text-accent-600"
            >
              <Glyph className="h-3.5 w-3.5" />
              {label}
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
   Réseaux : pastilles sous la description
   ============================================================ */

export function SocialLinks({
  instagram,
  tiktok,
  youtube,
  spotify,
  bio,
  editable = true,
}: {
  instagram: string | null
  tiktok: string | null
  youtube: string | null
  spotify: string | null
  bio?: string | null
  editable?: boolean
}) {
  const values: Record<SocialKey, string | null> = { instagram, tiktok, youtube, spotify }

  // Liens trouvés dans la description (en plus des 4 réseaux déclarés)
  const fromBio = extractLinks(bio ?? null)
  const extra = fromBio.filter((url) => {
    const brand = detectBrand(url)
    return brand ? !values[brand] : true
  })

  const items = (Object.keys(BRANDS) as SocialKey[]).map((key) => {
    const value = values[key]
    const bioLink = fromBio.find((url) => detectBrand(url) === key)
    const href = value ? socialHref(key, value) : (bioLink ?? '')
    return { key, href, active: Boolean(href), ...BRANDS[key] }
  })

  const others = extra
    .filter((url) => !detectBrand(url))
    .map((url) => ({
      key: url,
      href: url,
      active: true,
      label: new URL(url).hostname.replace(/^www\./, ''),
      glyph: Link2,
      className: 'border border-border bg-card text-fg-muted',
    }))

  const shown = editable ? items : items.filter((i) => i.active)
  if (shown.length === 0 && others.length === 0) return null

  return (
    <ul className="flex flex-wrap items-center gap-3" aria-label="Liens et réseaux sociaux">
      {shown.map(({ key, href, active, label, glyph: Glyph, className }) => {
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
      {others.map(({ key, href, label }) => (
        <li key={key}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${label} (nouvel onglet)`}
            className="flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-semibold transition-transform hover:scale-105"
          >
            <Link2 className="h-4 w-4" aria-hidden />
            <span className="max-w-24 truncate">{label}</span>
          </a>
        </li>
      ))}
    </ul>
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
  instagram: string | null
  tiktok: string | null
  youtube: string | null
  spotify: string | null
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

      {/* 4. Réseaux et liens — logos sous la description */}
      <div className="mt-4 px-4 md:px-2">
        <SocialLinks
          instagram={user.instagram}
          tiktok={user.tiktok}
          youtube={user.youtube}
          spotify={user.spotify}
          bio={user.bio}
        />
      </div>

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
