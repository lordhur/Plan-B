'use client'

import { CalendarClock, Check, Loader2, MapPin, PartyPopper, Ticket, Users } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { formatEventDate } from '@/lib/date'
import { formatPrice } from '@/lib/utils'
import { LogoMark } from '@/components/common/Logo'
import { EventMap } from '@/components/events/EventMap'
import { ShareEventModal } from '@/components/events/ShareEventModal'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'

/**
 * BOUCLE VIRALE — /join/[shareToken]
 * Page publique accessible sans compte : on voit tout le plan,
 * on s'inscrit en 30 secondes et on est automatiquement inscrit.
 */
export default function JoinByTokenPage() {
  const params = useParams<{ shareToken: string }>()
  const token = params.shareToken
  const router = useRouter()
  const { user, isAuthenticated, isLoading: sessionLoading } = useCurrentUser()

  const { data: event, isLoading } = trpc.events.byShareToken.useQuery(
    { token },
    { enabled: !!token },
  )

  const join = trpc.events.joinByShareToken.useMutation({
    onSuccess: (res) => {
      if (res.result === 'JOINED') toast.success('Vous participez à ce plan ! 🎉')
      if (res.result === 'PENDING') toast.info('Demande envoyée à l’organisateur ✋')
      if (res.result === 'WAITLISTED') toast.info(`Liste d’attente — position ${res.position}`)
      if (event) router.push(`/events/${event.slug}`)
    },
    onError: (err) => toast.error(err.message),
  })

  // Inscription rapide : on garde le token pour rejoindre après la création du compte
  useEffect(() => {
    if (!isAuthenticated && !sessionLoading && event && typeof window !== 'undefined') {
      const next = window.sessionStorage.getItem('planb_pending_join')
      if (!next) window.sessionStorage.setItem('planb_pending_join', token)
    }
  }, [isAuthenticated, sessionLoading, event, token])

  if (isLoading || sessionLoading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <LogoMark className="h-14 w-14" />
        <h1 className="text-xl font-bold">Ce plan n’existe plus</h1>
        <p className="max-w-sm text-sm text-fg-muted">
          Le lien a peut-être expiré. Découvrez les plans près de chez vous !
        </p>
        <Button asChild>
          <Link href="/">Explorer PlanB</Link>
        </Button>
      </div>
    )
  }

  const organizerName =
    event.organizer.displayName ||
    `${event.organizer.firstName} ${event.organizer.lastName.charAt(0)}.`
  const alreadyIn = event.myParticipation && ['CONFIRMED', 'PENDING', 'ATTENDED'].includes(event.myParticipation.status)

  return (
    <div className="min-h-screen bg-bg-secondary">
      <header className="flex items-center justify-between p-6">
        <Link href="/" aria-label="PlanB">
          <LogoMark />
        </Link>
        {!isAuthenticated && (
          <Button asChild size="sm" variant="ghost">
            <Link href="/login">J’ai déjà un compte</Link>
          </Button>
        )}
      </header>

      <main className="mx-auto max-w-lg px-4 pb-24">
        <div className="rounded-3xl bg-gradient-to-br from-primary-600 to-secondary-600 p-6 text-white shadow-glow">
          <PartyPopper className="h-8 w-8" aria-hidden />
          <p className="mt-3 text-sm font-medium text-white/80">
            {organizerName} vous invite à son plan sur PlanB
          </p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight">{event.title}</h1>
        </div>

        <Card className="-mt-4">
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge style={{ backgroundColor: `${event.category.color}22`, color: event.category.color }}>
                {event.category.name}
              </Badge>
              {event.isFull && <Badge variant="danger">Complet</Badge>}
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <CalendarClock className="h-5 w-5 shrink-0 text-primary-600" aria-hidden />
                <div>
                  <dt className="sr-only">Date</dt>
                  <dd className="font-semibold">{formatEventDate(event.startDate)}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 shrink-0 text-primary-600" aria-hidden />
                <div>
                  <dt className="sr-only">Lieu</dt>
                  <dd className="font-semibold">{event.locationName}</dd>
                  <dd className="text-fg-muted">{event.address}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 shrink-0 text-primary-600" aria-hidden />
                <div>
                  <dt className="sr-only">Participants</dt>
                  <dd>
                    {event.currentParticipants}
                    {event.maxParticipants != null ? `/${event.maxParticipants}` : ''} participants
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Ticket className="h-5 w-5 shrink-0 text-primary-600" aria-hidden />
                <div>
                  <dt className="sr-only">Prix</dt>
                  <dd className="font-semibold">{formatPrice(event.price, event.isFree)}</dd>
                </div>
              </div>
            </dl>

            <p className="whitespace-pre-wrap text-sm text-fg-muted">{event.description}</p>

            {!event.isOnline && (
              <div className="h-44 overflow-hidden rounded-xl border border-border">
                <EventMap
                  events={[
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
                  ]}
                  center={[event.latitude, event.longitude]}
                  zoom={13}
                  className="h-full w-full"
                />
              </div>
            )}

            <div className="flex items-center gap-3 rounded-xl bg-bg-secondary p-3">
              <Avatar src={event.organizer.avatarUrl} name={organizerName} />
              <div className="text-sm">
                <p className="font-semibold">
                  Organisé par {event.organizer.firstName} {event.organizer.lastName}
                </p>
                <p className="text-fg-muted">★ {event.organizer.averageRating.toFixed(1)} · confiance {event.organizer.trustScore}/100</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="mt-5 space-y-2.5">
          {isAuthenticated ? (
            alreadyIn ? (
              <Button asChild className="w-full" variant="secondary">
                <Link href={`/events/${event.slug}`}>
                  <Check className="h-4 w-4" aria-hidden /> Vous participez déjà — voir le plan
                </Link>
              </Button>
            ) : (
              <Button
                className="w-full"
                size="lg"
                disabled={join.isPending || !user?.emailVerified}
                onClick={() => join.mutate({ token })}
              >
                {join.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="h-4 w-4" aria-hidden />
                )}
                {event.isFull ? 'Rejoindre la liste d’attente' : 'Rejoindre ce plan'}
              </Button>
            )
          ) : (
            <>
              <Button asChild className="w-full" size="lg">
                <Link href={`/register?next=/join/${token}`}>
                  <Check className="h-4 w-4" aria-hidden /> Créer mon compte et rejoindre
                </Link>
              </Button>
              <p className="text-center text-xs text-fg-muted">
                Gratuit · 2 minutes · Vous serez automatiquement inscrit·e à ce plan
              </p>
            </>
          )}

          <ShareEventModal
            shareToken={event.shareToken}
            title={event.title}
            trigger={
              <Button variant="secondary" className="w-full">
                Partager à mon tour
              </Button>
            }
          />
        </div>

        <p className="mt-8 text-center text-xs text-fg-muted">
          PlanB — ne postez plus ce que vous avez fait, postez ce que vous allez faire.{' '}
          <Link href="/" className="font-semibold text-primary-600 underline">
            Découvrir les plans près de chez moi
          </Link>
        </p>
      </main>
    </div>
  )
}
