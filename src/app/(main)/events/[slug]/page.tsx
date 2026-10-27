'use client'

import {
  Accessibility,
  Ban,
  CalendarClock,
  Clock,
  Crown,
  Globe,
  Info,
  Lock,
  Camera,
  MapPin,
  MessageSquare,
  Share2,
  Star,
  Ticket,
  UserCheck,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { formatDuration, formatEventDate, formatRelative } from '@/lib/date'
import { ageFromBirthDate, formatDistance, formatPrice } from '@/lib/utils'
import { GENDER_RESTRICTION_LABELS, REGISTRATION_TYPE_LABELS } from '@/lib/constants'
import { AccessibilityBadges } from '@/components/common/AccessibilityBadges'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EventMap } from '@/components/events/EventMap'
import { JoinButton } from '@/components/events/JoinButton'
import { LikeButton } from '@/components/events/LikeButton'
import { useTranslate } from '@/lib/translate'
import { ShareEventModal } from '@/components/events/ShareEventModal'
import { CarpoolSection } from '@/components/events/CarpoolSection'
import { TicketBanner } from '@/components/events/TicketBanner'
import { AddToCalendar } from '@/components/events/AddToCalendar'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/** DÉTAIL ÉVÉNEMENT — page complète avec carte, participants, restrictions, partage. */
export default function EventDetailPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const { user, isAuthenticated } = useCurrentUser()

  const [coverFailed, setCoverFailed] = useState(false)
  const { data: event, isLoading, error } = trpc.events.bySlug.useQuery(
    { slug },
    { enabled: !!slug },
  )

  // Traduction automatique FR→EN (si la langue du site est l'anglais)
  const titleT = useTranslate(event?.title ?? null)
  const descriptionT = useTranslate(event?.description ?? null)

  const mapEvents = useMemo(
    () =>
      event
        ? [
            {
              id: event.id,
              slug: event.slug,
              title: event.title,
              latitude: event.latitude,
              longitude: event.longitude,
              startDate: event.startDate,
              city: event.city,
              currentParticipants: event.currentParticipants,
              maxParticipants: event.maxParticipants,
              category: event.category,
            },
          ]
        : [],
    [event],
  )

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4" aria-busy>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <Ban className="mx-auto h-12 w-12 text-danger-500" aria-hidden />
        <h1 className="mt-4 text-xl font-bold">Plan introuvable</h1>
        <p className="mt-2 text-sm text-fg-muted">
          {error?.message === 'Événement privé'
            ? 'Cet événement est privé — il faut une invitation pour le voir.'
            : 'Ce plan n’existe plus ou a été supprimé.'}
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Retour à l’accueil</Link>
        </Button>
      </div>
    )
  }

  const organizer = event.organizer
  const organizerName =
    organizer.displayName || `${organizer.firstName} ${organizer.lastName}`
  const duration = formatDuration(event.startDate, event.endDate)
  const myStatus = event.myParticipation?.status ?? null

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* En-tête — visuel plein largeur avec effet Ken Burns */}
      {event.coverImage && !coverFailed ? (
        <header className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-3xl">
          <div className="relative aspect-[16/10] w-full overflow-hidden sm:aspect-[21/9]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.coverImage}
              alt=""
              onError={() => setCoverFailed(true)}
              className="ken-burns h-full w-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className="border-0 font-bold text-white"
                  style={{ backgroundColor: event.category.color }}
                >
                  <CategoryIcon name={event.category.icon} className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                  {event.category.name}
                </Badge>
                {event.status === 'CANCELLED' && <Badge variant="danger">Annulé</Badge>}
                {event.status === 'COMPLETED' && <Badge variant="outline">Terminé</Badge>}
                {event.isSponsored && (
                  <Badge className="border-0 bg-white/90 text-[10px] text-fg">Sponsorisé</Badge>
                )}
              </div>
              <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-white drop-shadow-lg sm:text-4xl">
                {titleT || event.title}
              </h1>
              <p className="mt-1 text-sm text-white/80">
                Publié {formatRelative(event.createdAt)} · {event.viewCount} vues
              </p>
            </div>
          </div>
        </header>
      ) : (
        <header
          className="relative overflow-hidden rounded-3xl border border-border/60 p-5"
          style={{
            background: `
              radial-gradient(110% 130% at 12% 0%, ${event.category.color}44, transparent 55%),
              radial-gradient(90% 120% at 90% 100%, #22d3ee33, transparent 55%)
            `,
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className="border-0"
              style={{ backgroundColor: `${event.category.color}22`, color: event.category.color }}
            >
              {event.category.name}
            </Badge>
            {event.status === 'CANCELLED' && <Badge variant="danger">Annulé</Badge>}
            {event.status === 'COMPLETED' && <Badge variant="outline">Terminé</Badge>}
            {event.isSponsored && (
              <Badge variant="outline" className="text-[10px]">
                Sponsorisé
              </Badge>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
            {titleT || event.title}
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Publié {formatRelative(event.createdAt)} · {event.viewCount} vues
          </p>
        </header>
      )}

      {event.status === 'CANCELLED' && event.cancelReason && (
        <div className="rounded-xl border border-danger-500/40 bg-danger-50 p-4 text-sm dark:bg-danger-500/10">
          <p className="font-semibold text-danger-600">Plan annulé</p>
          <p className="mt-1 text-fg-muted">{event.cancelReason}</p>
        </div>
      )}

      {/* Infos clés */}
      <Card>
        <CardContent className="space-y-3.5 pt-5">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
            <div>
              <p className="font-semibold">{formatEventDate(event.startDate)}</p>
              {duration && <p className="text-sm text-fg-muted">Durée : {duration}</p>}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
            <div>
              <p className="font-semibold">
                {event.isOnline ? 'En ligne' : event.locationName}
              </p>
              {!event.isOnline && (
                <p className="text-sm text-fg-muted">
                  {event.address}
                  {event.zipCode ? `, ${event.zipCode}` : ''} {event.city}
                </p>
              )}
              {event.isOnline && event.onlineLink && myStatus && (
                <a
                  href={event.onlineLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary-600 underline"
                >
                  <Globe className="mr-1 inline h-3.5 w-3.5" aria-hidden /> Rejoindre en ligne
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Ticket className="h-5 w-5 shrink-0 text-primary-600" aria-hidden />
            <p className="font-semibold">{formatPrice(event.price, event.isFree)}</p>
          </div>
          {event.hasMeetup && (
            <div className="flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50/50 p-3 dark:border-primary-900 dark:bg-primary-950/30">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
              <div>
                <p className="font-semibold">Lieu de rendez-vous</p>
                {event.canSeeMeetup && event.meetupAddress ? (
                  <p className="text-sm font-medium">{event.meetupAddress}</p>
                ) : event.meetupVisibility === 'SCHEDULED' && event.meetupRevealAt ? (
                  <p className="text-sm text-fg-muted">
                    🔒 Communiqué aux inscrits le{' '}
                    {new Date(event.meetupRevealAt).toLocaleString('fr-FR', {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    })}
                  </p>
                ) : (
                  <p className="text-sm text-fg-muted">🔒 Réservé aux inscrits</p>
                )}
              </div>
            </div>
          )}
          <div className="space-y-1.5 border-t border-border pt-3.5">
            <p className="text-sm font-bold">📅 Ajouter à mon agenda</p>
            <AddToCalendar
              title={event.title}
              description={`${event.description ?? ''}\n\nRetrouvez ce plan sur PlanB.`}
              location={
                event.isOnline
                  ? 'En ligne'
                  : [event.address, event.zipCode, event.city].filter(Boolean).join(', ')
              }
              start={event.startDate}
              end={event.endDate ?? new Date(event.startDate.getTime() + 2 * 3600 * 1000)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-secondary px-3 py-1.5 font-semibold">
              <Users className="h-4 w-4" aria-hidden />
              {event.currentParticipants}
              {event.maxParticipants != null ? `/${event.maxParticipants}` : ''} participants
              {event.isFull && <span className="text-danger-500">· Complet</span>}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-secondary px-3 py-1.5 font-semibold text-fg-muted">
              {event.registrationType === 'APPROVAL_REQUIRED' ? (
                <UserCheck className="h-4 w-4" aria-hidden />
              ) : (
                <Lock className="h-4 w-4" aria-hidden />
              )}
              {REGISTRATION_TYPE_LABELS[event.registrationType]}
            </span>
            <AccessibilityBadges
              wheelchair={event.wheelchairAccessible}
              hearing={event.hearingAccessible}
              visually={event.visuallyAccessible}
              showLabel
            />
          </div>
          {event.accessibilityNotes && (
            <p className="flex items-start gap-2 rounded-xl bg-secondary-50 p-3 text-sm text-secondary-800 dark:bg-secondary-900/40 dark:text-secondary-200">
              <Accessibility className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {event.accessibilityNotes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Carte */}
      {!event.isOnline && (
        <div className="h-64 overflow-hidden rounded-2xl border border-border">
          <EventMap events={mapEvents} center={[event.latitude, event.longitude]} zoom={14} className="h-full w-full" />
        </div>
      )}

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">À propos de ce plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-muted">
            {descriptionT || event.description}
          </p>
          {event.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {event.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organisateur */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organisé par</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href={`/profile/${organizer.id}`} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-bg-secondary">
            <Avatar src={organizer.avatarUrl} name={organizerName} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-bold">
                {organizerName}
                {organizer.trustScore >= 80 && (
                  <span title="Membre de confiance" className="text-secondary-500">
                    <Crown className="h-4 w-4" aria-label="Membre de confiance" />
                  </span>
                )}
              </p>
              <p className="flex items-center gap-2 text-sm text-fg-muted">
                <span className="font-medium text-warning-600">
                  <Star className="mr-0.5 inline h-3.5 w-3.5 fill-current" aria-hidden />
                  {organizer.averageRating.toFixed(1)}
                </span>
                ({organizer.totalRatings} avis) · {organizer.eventsCreated} plans créés
              </p>
            </div>
          </Link>
          {organizer.badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {organizer.badges.map((ub: { badge: { code: string; name: string; icon: string; color: string } }) => (
                <span
                  key={ub.badge.code}
                  title={ub.badge.name}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ backgroundColor: `${ub.badge.color}22`, color: ub.badge.color }}
                >
                  🏅 {ub.badge.name}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restrictions */}
      {(event.minAge != null || event.maxAge != null || event.genderRestriction !== 'ALL' || event.minRating != null) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4 text-fg-muted" aria-hidden /> Conditions de participation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm text-fg-muted">
              {(event.minAge != null || event.maxAge != null) && (
                <li>
                  🎂 Âge : {event.minAge ?? 0} – {event.maxAge ?? '∞'} ans
                  {user && (
                    <span className="ml-1.5 text-xs">
                      (vous avez {ageFromBirthDate(new Date(user.dateOfBirth))} ans)
                    </span>
                  )}
                </li>
              )}
              {event.genderRestriction !== 'ALL' && (
                <li>👥 {GENDER_RESTRICTION_LABELS[event.genderRestriction]}</li>
              )}
              {event.minRating != null && <li>⭐ Note de profil minimale : {event.minRating.toFixed(1)}</li>}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Participants ({event.currentParticipants}
            {event.maxParticipants != null ? `/${event.maxParticipants}` : ''})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {event.participations.length > 0 ? (
            <ul className="flex flex-wrap gap-3">
              {event.participations.map((p) => (
                <li key={p.id} className="flex flex-col items-center gap-1">
                  <Link href={`/profile/${p.user.id}`} aria-label={`Profil de ${p.user.firstName}`}>
                    <Avatar
                      src={p.user.avatarUrl}
                      name={p.user.displayName || `${p.user.firstName} ${p.user.lastName}`}
                      className={p.status === 'PENDING' ? 'opacity-50' : ''}
                    />
                  </Link>
                  <span className="max-w-16 truncate text-[11px] font-medium text-fg-muted">
                    {p.user.firstName}
                    {p.status === 'PENDING' ? ' ✋' : ''}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-muted">Personne pour l’instant — soyez le premier !</p>
          )}
          {event.waitlist.length > 0 && (
            <p className="mt-3 rounded-lg bg-bg-secondary p-2.5 text-xs font-medium text-fg-muted">
              ⏳ {event.waitlist.length} personne{event.waitlist.length > 1 ? 's' : ''} en liste d’attente
            </p>
          )}
        </CardContent>
      </Card>

      {/* Billetterie — plans payants */}
      {event.status === 'UPCOMING' && event.price != null && event.price > 0 && (
        <TicketBanner
          eventId={event.id}
          eventSlug={event.slug}
          title={event.title}
          price={event.price}
          currency={event.currency}
          myStatus={myStatus}
          paymentId={event.myParticipation?.paymentId ?? null}
          isOrganizer={event.isOrganizer}
        />
      )}

      {/* Album photos (pendant/après l'événement) */}
      {(event.status === 'COMPLETED' || event.status === 'ONGOING') && (
        <Button asChild variant="outline">
          <Link href={`/events/${event.slug}/photos`}>
            <Camera className="h-4 w-4" aria-hidden /> Voir l’album photos
          </Link>
        </Button>
      )}

      {/* Covoiturage — événement à venir */}
      {event.status === 'UPCOMING' && (
        <CarpoolSection
          eventId={event.id}
          canParticipate={event.isOrganizer || myStatus === 'CONFIRMED' || myStatus === 'ATTENDED'}
        />
      )}

      {/* Chat d'événement — organisateur + participants confirmés */}
      {(myStatus === 'CONFIRMED' || myStatus === 'ATTENDED' || event.isOrganizer) &&
        event.status !== 'CANCELLED' && (
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href={`/events/${event.slug}/chat`}>
                <MessageSquare className="h-4 w-4" aria-hidden /> Chat des participants
              </Link>
            </Button>
            {event.status === 'COMPLETED' && (
              <Button asChild variant="secondary" className="flex-1">
                <Link href={`/events/${event.slug}/rate`}>
                  <Star className="h-4 w-4" aria-hidden /> Noter les participants
                </Link>
              </Button>
            )}
          </div>
        )}

      {/* Barre d'action */}
      {event.status === 'UPCOMING' && (
        <div className="sticky bottom-20 z-30 flex gap-2 rounded-2xl border border-border bg-card/95 p-3 shadow-card-hover backdrop-blur md:bottom-6">
          <JoinButton
            eventId={event.id}
            eventSlug={event.slug}
            registrationType={event.registrationType}
            isFull={event.isFull}
            myStatus={myStatus}
            isOrganizer={event.isOrganizer}
            waitlistPosition={event.myWaitlistPosition}
            className="flex-1"
          />
          <LikeButton eventId={event.id} liked={!!event.myLiked} count={event.likeCount ?? 0} />
          <ShareEventModal
            shareToken={event.shareToken}
            title={event.title}
            trigger={
              <Button variant="secondary" aria-label="Partager ce plan">
                <Share2 className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Partager</span>
              </Button>
            }
          />
        </div>
      )}
    </div>
  )
}
