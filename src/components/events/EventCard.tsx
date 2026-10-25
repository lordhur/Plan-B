'use client'

import {
  Accessibility,
  Clock,
  Ear,
  Eye,
  Lock,
  MapPin,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { formatEventDate } from '@/lib/date'
import { formatDistance as fmtDist, formatPrice } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { JoinButton } from './JoinButton'
import { AccessibilityBadges } from '@/components/common/AccessibilityBadges'

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
}

/** Carte d'événement du fil d'actualité. */
export function EventCard({ event, distanceKm, myStatus, isOrganizer, readOnly }: EventCardProps) {
  const spots =
    event.maxParticipants != null
      ? `${event.currentParticipants}/${event.maxParticipants} places`
      : `${event.currentParticipants} participants`
  const isFull = event.maxParticipants != null && event.currentParticipants >= event.maxParticipants
  const organizerName =
    event.organizer.displayName || `${event.organizer.firstName} ${event.organizer.lastName.charAt(0)}.`

  return (
    <article className="animate-card-in overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover">
      {/* Bandeau catégorie */}
      <div
        className="flex h-2 w-full"
        style={{ backgroundColor: event.category.color }}
        aria-hidden
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Badge
                className="border-0"
                style={{ backgroundColor: `${event.category.color}22`, color: event.category.color }}
              >
                {event.category.name}
              </Badge>
              {event.isSponsored && (
                <Badge variant="outline" className="text-[10px]">
                  <Sparkles className="h-3 w-3" aria-hidden /> Sponsorisé
                </Badge>
              )}
            </div>
            <h3 className="text-base font-bold leading-snug">
              <Link href={`/events/${event.slug}`} className="hover:text-primary-600">
                {event.title}
              </Link>
            </h3>
          </div>
        </div>

        <dl className="mt-3 space-y-1.5 text-sm text-fg-muted">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" aria-hidden />
            <dd>{formatEventDate(event.startDate)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden />
            <dd className="truncate">
              {event.isOnline ? 'En ligne' : `${event.locationName}, ${event.city}`}
              {distanceKm != null && !event.isOnline && (
                <span className="ml-1.5 font-medium text-primary-600">· {fmtDist(distanceKm)}</span>
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
              <span className="font-medium text-warning-600">★ {event.organizer.averageRating.toFixed(1)}</span>
            </dd>
          </div>
        </dl>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${
              isFull ? 'bg-danger-50 text-danger-600 dark:bg-danger-500/15' : 'bg-bg-secondary text-fg-muted'
            }`}
          >
            <Users className="h-3.5 w-3.5" aria-hidden /> {isFull ? 'Complet' : spots}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-bg-secondary px-2.5 py-1 font-semibold text-fg-muted">
            {formatPrice(event.price, event.isFree)}
          </span>
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
          <div className="mt-4 flex gap-2">
            <JoinButton
              eventId={event.id}
              eventSlug={event.slug}
              registrationType={event.registrationType}
              isFull={isFull}
              myStatus={myStatus}
              isOrganizer={isOrganizer}
              className="flex-1"
            />
            <Link
              href={`/events/${event.slug}`}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg"
            >
              <Eye className="h-4 w-4" aria-hidden /> Détails
            </Link>
          </div>
        )}
      </div>
    </article>
  )
}
