'use client'

import {
  Award,
  CalendarDays,
  MapPin,
  Pencil,
  Settings,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { ageFromBirthDate } from '@/lib/utils'
import { formatFullDate } from '@/lib/date'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { EventCard } from '@/components/events/EventCard'

/** MON PROFIL — vue personnelle avec onglets à venir / passés / organisés. */
export default function MyProfilePage() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useCurrentUser()
  const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: isAuthenticated })
  const { data: upcoming } = trpc.events.mine.useQuery({ role: 'participating' })
  const { data: past } = trpc.events.mine.useQuery({ role: 'past' })
  const { data: organized } = trpc.events.mine.useQuery({ role: 'organized' })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login?next=/profile')
  }, [isLoading, isAuthenticated, router])

  if (isLoading) return <LoadingSpinner className="py-20" />
  if (!isAuthenticated || !me) return null

  const displayName = me.displayName || `${me.firstName} ${me.lastName}`
  const fullName = `${me.firstName} ${me.showLastName ? me.lastName : `${me.lastName.charAt(0)}.`}`

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Carte de profil */}
      <Card>
        <CardContent className="flex flex-col items-center pt-8 text-center">
          <Avatar src={me.avatarUrl} name={displayName} size="xl" />
          <h1 className="mt-4 text-2xl font-extrabold">
            {fullName}
            {me.showAge ? `, ${ageFromBirthDate(new Date(me.dateOfBirth))} ans` : ''}
          </h1>
          {me.city && (
            <p className="mt-1 flex items-center gap-1 text-sm text-fg-muted">
              <MapPin className="h-4 w-4" aria-hidden /> {me.city}
            </p>
          )}
          <p className="mt-2 flex items-center gap-2 text-sm">
            <span className="font-semibold text-warning-600">
              <Star className="mr-0.5 inline h-3.5 w-3.5 fill-current" aria-hidden />
              {me.averageRating.toFixed(1)}
            </span>
            <span className="text-fg-muted">({me.totalRatings} avis)</span>
          </p>

          {/* Badges */}
          {me.badges?.length ? (
            <ul className="mt-4 flex flex-wrap justify-center gap-1.5" aria-label="Mes badges">
              {me.badges.map((b: { badge: { code: string; name: string; color: string; description: string } }) => (
                <li
                  key={b.badge.code}
                  title={b.badge.description}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ backgroundColor: `${b.badge.color}22`, color: b.badge.color }}
                >
                  <Award className="h-3.5 w-3.5" aria-hidden /> {b.badge.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-fg-muted">
              Participez à des plans pour gagner vos premiers badges 🏅
            </p>
          )}

          {/* Stats */}
          <dl className="mt-5 grid w-full grid-cols-3 gap-2">
            {(
              [
                [me.eventsCreated, 'Plans créés'],
                [me.eventsAttended, 'Plans rejoints'],
                [me.friendCount, 'Amis'],
              ] as const
            ).map(([value, label]) => (
              <div key={label} className="rounded-xl bg-bg-secondary p-3">
                <dt className="sr-only">{label}</dt>
                <dd className="text-xl font-extrabold text-primary-600">{value}</dd>
                <dd className="text-[11px] font-medium text-fg-muted">{label}</dd>
              </div>
            ))}
          </dl>

          {me.bio && <p className="mt-4 max-w-md text-sm text-fg-muted">{me.bio}</p>}

          {/* Passions */}
          {me.interests.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-1.5" aria-label="Mes passions">
              {me.interests.map((i: { id: string; name: string }) => (
                <Badge key={i.id} variant="secondary">
                  {i.name}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-5 flex w-full gap-2">
            <Button asChild variant="secondary" className="flex-1">
              <Link href="/profile/edit">
                <Pencil className="h-4 w-4" aria-hidden /> Modifier
              </Link>
            </Button>
            <Button asChild variant="secondary" className="flex-1">
              <Link href="/profile/settings">
                <Settings className="h-4 w-4" aria-hidden /> Paramètres
              </Link>
            </Button>
          </div>

          {!me.emailVerified && (
            <p className="mt-3 text-xs font-semibold text-warning-600">
              ⚠️ Email non vérifié —{' '}
              <Link href="/verify" className="underline">
                vérifier maintenant
              </Link>
            </p>
          )}
          <p className="mt-2 text-[11px] text-fg-muted">Membre depuis {formatFullDate(me.createdAt)}</p>
        </CardContent>
      </Card>

      {/* Plans à venir */}
      <section aria-labelledby="profile-upcoming">
        <h2 id="profile-upcoming" className="mb-3 flex items-center gap-2 text-lg font-bold">
          <CalendarDays className="h-5 w-5 text-primary-600" aria-hidden /> Mes prochains plans
        </h2>
        {upcoming && upcoming.length > 0 ? (
          <div className="grid gap-4">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event as never} readOnly />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="Aucun plan à venir"
            description="Rejoignez un plan ou créez le vôtre !"
            action={
              <Button asChild>
                <Link href="/explore">Explorer les plans</Link>
              </Button>
            }
            className="py-8"
          />
        )}
      </section>

      {/* Plans organisés */}
      {organized && organized.length > 0 && (
        <section aria-labelledby="profile-organized">
          <h2 id="profile-organized" className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Users className="h-5 w-5 text-secondary-500" aria-hidden /> Mes plans organisés
          </h2>
          <div className="grid gap-4">
            {organized.map((event) => (
              <EventCard key={event.id} event={event as never} readOnly />
            ))}
          </div>
        </section>
      )}

      {/* Plans passés */}
      {past && past.length > 0 && (
        <section aria-labelledby="profile-past">
          <h2 id="profile-past" className="mb-3 text-lg font-bold">Plans passés</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {past.slice(0, 5).map((event) => (
              <li key={event.id}>
                <Link
                  href={`/events/${event.slug}`}
                  className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-bg-secondary"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{event.title}</p>
                    <p className="text-xs text-fg-muted">
                      {formatFullDate(event.startDate)} · {event.city}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {event.category.name}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
