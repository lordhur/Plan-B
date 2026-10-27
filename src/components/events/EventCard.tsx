'use client'

import {
  Clock,
  Eye,
  Lock,
  MapPin,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { formatEventDate } from '@/lib/date'
import { formatDistance as fmtDist, formatPrice } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { TiltCard } from '@/components/common/TiltCard'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { JoinButton } from './JoinButton'
import { LikeButton } from './LikeButton'
import { AccessibilityBadges } from '@/components/common/AccessibilityBadges'
import { useLang } from '@/lib/i18n'
import { useTranslate } from '@/lib/translate'

export interface EventCardData {
  id: string
  slug: string
  title: string
  startDate: Date | string
  locationName: string
  city: string
  isOnline: boolean
  maxParticipants: number | null
  currentParticipants: number
  registrationType: 'OPEN' | 'APPROVAL_REQUIRED' | 'INVITATION_ONLY'
  isFree: boolean
  price: number | null
  wheelchairAccessible: boolean
  hearingAccessible: boolean
  visuallyAccessible: boolean
  isSponsored: boolean
  coverImage?: string | null
  category: { name: string; icon: string; color: string }
  organizer: {
    id: string
    firstName: string
    lastName: string
    displayName: string | null
    avatarUrl: string | null
    averageRating: number
  }
}

interface EventCardProps {
  event: EventCardData
  distanceKm?: number | null
  myStatus?: string | null
  isOrganizer?: boolean
  /** Désactive le bouton rejoindre (cartes en lecture seule). */
  readOnly?: boolean
  /** Position dans la liste — décale l'animation d'entrée (cascade). */
  index?: number
  /** Nombre de likes du plan. */
  likes?: number
  /** L'utilisateur connecté a liké ce plan. */
  liked?: boolean
  /** Position de l'utilisateur dans la liste d'attente (null = pas en attente). */
  waitlistPosition?: number | null
}

/** Carte d'événement — visuel pleine largeur, inclinaison 3D et reflet au survol. */
function EventCardBase({
  event,
  distanceKm,
  myStatus,
  isOrganizer,
  readOnly,
  index = 0,
  likes = 0,
  liked = false,
  waitlistPosition = null,
}: EventCardProps) {
  const { t } = useLang()
  const titleT = useTranslate(event.title)
  const [imgFailed, setImgFailed] = React.useState(false)
  const showImage = !!event.coverImage && !imgFailed

  const spots =
    event.maxParticipants != null
      ? `${event.currentParticipants}/${event.maxParticipants}`
      : `${event.currentParticipants}`
  const isFull = event.maxParticipants != null && event.currentParticipants >= event.maxParticipants
  const organizerName =
    event.organizer.displayName || `${event.organizer.firstName} ${event.organizer.lastName.charAt(0)}.`
  const catColor = event.category.color || '#8b5cf6'

  return (
    <TiltCard
      className="group animate-card-in rounded-3xl"
      style={{ '--i': Math.min(index, 12) } as React.CSSProperties}
    >
      <article className="glow-border relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
        {/* ---------- Visuel ---------- */}
        <div className="relative aspect-[16/9] w-full overflow-hidden [contain:paint] sm:aspect-[2/1]">
          {showImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={event.coverImage!}
              alt=""
              loading="lazy"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover transition-transform duration-500 ease-out will-change-transform [backface-visibility:hidden] group-hover:scale-[1.05]"
            />
          ) : (
            /* Repli : dégradé généré depuis la couleur de catégorie */
            <div
              aria-hidden
              className="sheen-auto absolute inset-0"
              style={{
                background: `
                  radial-gradient(120% 100% at 15% 10%, ${catColor}66, transparent 55%),
                  radial-gradient(100% 120% at 85% 90%, #22d3ee44, transparent 55%),
                  linear-gradient(135deg, ${catColor}2e, #0f172a14 60%, ${catColor}1f)
                `,
              }}
            >
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none opacity-35 transition-transform duration-700 group-hover:scale-110">
                <CategoryIcon name={event.category.icon} className="h-24 w-24" />
              </span>
            </div>
          )}

          {/* Dégradé de lisibilité */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-card via-card/55 to-transparent"
          />

          {/* Pastille date */}
          <div className="absolute left-3 top-3 flex flex-col items-center rounded-2xl bg-black/55 px-2.5 py-1.5 text-white backdrop-blur-md">
            <Clock className="mb-0.5 h-3.5 w-3.5" aria-hidden />
            <span className="text-[11px] font-bold leading-tight">
              {formatEventDate(event.startDate)}
            </span>
          </div>

          {/* Pastilles prix / places / like */}
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            <span className="rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
              {formatPrice(event.price, event.isFree)}
            </span>
            <LikeButton
              eventId={event.id}
              liked={liked}
              count={likes}
              className="bg-black/55 text-white backdrop-blur-md hover:border-danger-300"
            />
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold backdrop-blur-md ${
                isFull ? 'bg-danger-500/90 text-white' : 'bg-black/55 text-white'
              }`}
            >
              {isFull ? t('card_full') : `${spots} ${event.maxParticipants != null ? t('card_places') : t('card_participants')}`}
            </span>
          </div>

          {/* Catégorie + sponsorisé, en bas du visuel */}
          <div className="absolute bottom-2.5 left-3 flex flex-wrap items-center gap-1.5">
            <Badge
              className="border-0 font-bold backdrop-blur-md"
              style={{ backgroundColor: `${catColor}dd`, color: '#fff' }}
            >
              <CategoryIcon name={event.category.icon} className="h-3 w-3" />
              {event.category.name}
            </Badge>
            {event.isSponsored && (
              <Badge className="border-0 bg-white/85 text-[10px] text-fg backdrop-blur-md">
                <Sparkles className="h-3 w-3" aria-hidden /> Sponsorisé
              </Badge>
            )}
          </div>
        </div>

        {/* ---------- Contenu ---------- */}
        <div className="flex flex-1 flex-col p-5 pt-3.5">
          <h3 className="text-base font-bold leading-snug tracking-tight">
            <Link
              href={`/events/${event.slug}`}
              className="transition-colors hover:text-primary-500 focus-visible:text-primary-500"
            >
              <span className="absolute inset-0" aria-hidden />
              {titleT || event.title}
            </Link>
          </h3>

          <dl className="mt-2.5 space-y-1.5 text-sm text-fg-muted">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              <dd className="truncate">
                {event.isOnline ? t('card_online') : `${event.locationName}, ${event.city}`}
                {distanceKm != null && !event.isOnline && (
                  <span className="ml-1.5 font-medium text-primary-500">· {fmtDist(distanceKm)}</span>
                )}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <Avatar
                src={event.organizer.avatarUrl}
                name={organizerName}
                size="sm"
                className="h-5 w-5 text-[9px]"
              />
              <dd>
                Par {organizerName} ·{' '}
                <span className="font-medium text-warning-500">
                  ★ {event.organizer.averageRating.toFixed(1)}
                </span>
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
            {event.registrationType === 'APPROVAL_REQUIRED' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-50 px-2.5 py-1 font-semibold text-warning-600 dark:bg-warning-500/15">
                <UserCheck className="h-3.5 w-3.5" aria-hidden /> Sur validation
              </span>
            )}
            {event.registrationType === 'INVITATION_ONLY' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-bg-secondary px-2.5 py-1 font-semibold text-fg-muted">
                <Lock className="h-3.5 w-3.5" aria-hidden /> Sur invitation
              </span>
            )}
            <AccessibilityBadges
              wheelchair={event.wheelchairAccessible}
              hearing={event.hearingAccessible}
              visually={event.visuallyAccessible}
            />
          </div>

          {!readOnly && (
            <div className="relative z-10 mt-auto flex gap-2 pt-4">
              <JoinButton
                eventId={event.id}
                eventSlug={event.slug}
                registrationType={event.registrationType}
                isFull={isFull}
                myStatus={myStatus}
                isOrganizer={isOrganizer}
                waitlistPosition={waitlistPosition}
                className="flex-1"
              />
              <Link
                href={`/events/${event.slug}`}
                aria-label={`${t('card_details')} — ${event.title}`}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border text-fg-muted transition-colors hover:border-primary-500/50 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/40"
              >
                <Eye className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          )}
        </div>
      </article>
    </TiltCard>
  )
}


export const EventCard = React.memo(EventCardBase)
