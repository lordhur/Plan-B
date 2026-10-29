'use client'

import { Award, CalendarDays, Sparkles, Star, Users } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EventCard } from '@/components/events/EventCard'
import { AlbumsSection } from '@/components/profile/AlbumsSection'
import { MemoriesSection } from '@/components/profile/MemoriesSection'
import { ProfileFavorites } from '@/components/profile/ProfileFavorites'
import { ProfileHeader, type ProfileTab } from '@/components/profile/ProfileHeader'
import { ProfileMediaSection } from '@/components/profile/ProfileMediaSection'
import { ProfileSocialTab } from '@/components/profile/ProfileSocialTab'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatFullDate } from '@/lib/date'
import { parseSocialLinks } from '@/lib/socialLinks'
import { useCurrentUser } from '@/lib/session'
import { trpc } from '@/lib/trpc'
import { ageFromBirthDate } from '@/lib/utils'

/** MON PROFIL — couverture, avatar, réseaux et contenu en quatre tuiles. */
export default function MyProfilePage() {
  const router = useRouter()
  const { isLoading, isAuthenticated } = useCurrentUser()
  const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: isAuthenticated })
  const { data: upcoming } = trpc.events.mine.useQuery(
    { role: 'participating' },
    { enabled: isAuthenticated },
  )
  const { data: past } = trpc.events.mine.useQuery({ role: 'past' }, { enabled: isAuthenticated })
  const { data: organized } = trpc.events.mine.useQuery(
    { role: 'organized' },
    { enabled: isAuthenticated },
  )
  const { data: stories } = trpc.stories.feed.useQuery(undefined, { enabled: isAuthenticated })
  const [tab, setTab] = useState<ProfileTab>('media')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login?next=/profile')
  }, [isLoading, isAuthenticated, router])

  if (isLoading) return <LoadingSpinner className="py-20" />
  if (!isAuthenticated || !me) return null

  const displayName = me.displayName || `${me.firstName} ${me.lastName}`

  // Liens du profil dans l'ordre choisi ; à défaut, reprise des 4 anciens champs.
  const savedLinks = parseSocialLinks(me.socialLinks)
  const profileLinks =
    savedLinks.length > 0
      ? savedLinks
      : (
          [
            ['instagram', me.instagram],
            ['tiktok', me.tiktok],
            ['youtube', me.youtube],
            ['spotify', me.spotify],
          ] as const
        )
          .filter(([, url]) => Boolean(url))
          .map(([type, url]) => ({ type, url: url as string }))

  // L'anneau de l'avatar n'apparaît que si une story est en ligne (la mienne).
  const hasStory = Boolean(stories?.some((group) => group.isMe && group.items.length > 0))

  return (
    <div className="mx-auto -mt-6 max-w-2xl pb-6 md:mt-0">
      <ProfileHeader
        user={{
          displayName: me.displayName,
          firstName: me.firstName,
          lastName: me.lastName,
          showLastName: me.showLastName,
          coverImage: me.coverImage,
          avatarUrl: me.avatarUrl,
          friendCount: me.friendCount,
          eventsAttended: me.eventsAttended,
          eventsCreated: me.eventsCreated,
          averageRating: me.averageRating,
          totalRatings: me.totalRatings,
          bio: me.bio,
          links: profileLinks,
        }}
        activeTab={tab}
        onTabChange={setTab}
        hasStory={hasStory}
      />

      <div className="space-y-6 px-4 pt-6 md:px-2">
        {!me.emailVerified && (
          <p className="rounded-xl border border-warning-500/40 bg-warning-50 px-4 py-3 text-sm font-semibold text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">
            ⚠️ Email non vérifié —{' '}
            <Link href="/verify" className="underline">
              vérifier maintenant
            </Link>
          </p>
        )}

        {/* MÉDIA — mes photos, mes albums créés et mes vidéos (rien d'autre) */}
        {tab === 'media' && (
          <section aria-label="Mes médias" className="space-y-6">
            <ProfileMediaSection showFavorites={false} />
            <AlbumsSection userId={me.id} isMe />
          </section>
        )}

        {/* EVENEMENTS */}
        {tab === 'events' && (
          <div className="space-y-6">
            <section aria-labelledby="profile-upcoming">
              <h2 id="profile-upcoming" className="mb-3 flex items-center gap-2 text-lg font-bold">
                <CalendarDays className="h-5 w-5 text-primary-600" aria-hidden /> Mes prochains
                plans
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
                      <Link href="/events/calendar">Voir les plans</Link>
                    </Button>
                  }
                  className="py-8"
                />
              )}
            </section>

            {organized && organized.length > 0 && (
              <section aria-labelledby="profile-organized">
                <h2
                  id="profile-organized"
                  className="mb-3 flex items-center gap-2 text-lg font-bold"
                >
                  <Users className="h-5 w-5 text-secondary-500" aria-hidden /> Mes plans organisés
                </h2>
                <div className="grid gap-4">
                  {organized.map((event) => (
                    <EventCard key={event.id} event={event as never} readOnly />
                  ))}
                </div>
              </section>
            )}

            {past && past.length > 0 && (
              <section aria-labelledby="profile-past">
                <h2 id="profile-past" className="mb-3 text-lg font-bold">
                  Plans passés
                </h2>
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

            {me.badges?.length > 0 && (
              <section aria-labelledby="profile-badges">
                <h2 id="profile-badges" className="mb-3 flex items-center gap-2 text-lg font-bold">
                  <Award className="h-5 w-5 text-secondary-500" aria-hidden /> Mes badges
                </h2>
                <ul className="flex flex-wrap gap-1.5">
                  {me.badges.map(
                    (b: {
                      badge: { code: string; name: string; color: string; description: string }
                    }) => (
                      <li
                        key={b.badge.code}
                        title={b.badge.description}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ backgroundColor: `${b.badge.color}22`, color: b.badge.color }}
                      >
                        <Award className="h-3.5 w-3.5" aria-hidden /> {b.badge.name}
                      </li>
                    ),
                  )}
                </ul>
              </section>
            )}
          </div>
        )}

        {/* SOUVENIRS — photos/vidéos des événements + photos où je suis identifié */}
        {tab === 'memories' && <MemoriesSection />}

        {/* SOCIAL — amis, groupes et pages */}
        {tab === 'social' && (
          <div className="space-y-7">
            <ProfileSocialTab />
            <ProfileFavorites />

            <section aria-labelledby="profile-social-about">
              <h2 id="profile-social-about" className="mb-2 text-lg font-bold">
                À propos
              </h2>
              <dl className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card text-sm">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <dt className="text-fg-muted">Nom</dt>
                  <dd className="font-semibold">
                    {me.firstName} {me.showLastName ? me.lastName : `${me.lastName.charAt(0)}.`}
                  </dd>
                </div>
                {me.showAge && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <dt className="text-fg-muted">Âge</dt>
                    <dd className="font-semibold">
                      {ageFromBirthDate(new Date(me.dateOfBirth))} ans
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <dt className="text-fg-muted">Note</dt>
                  <dd className="flex items-center gap-1 font-semibold">
                    <Star className="h-4 w-4 fill-accent-500 text-accent-500" aria-hidden />
                    {me.averageRating.toFixed(1).replace('.', ',')}
                    <span className="font-normal text-fg-muted">({me.totalRatings} avis)</span>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <dt className="text-fg-muted">Membre depuis</dt>
                  <dd className="font-semibold">{formatFullDate(me.createdAt)}</dd>
                </div>
              </dl>
            </section>

            {me.interests.length > 0 && (
              <section aria-labelledby="profile-interests">
                <h2 id="profile-interests" className="mb-2 text-lg font-bold">
                  Mes passions
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {me.interests.map((i: { id: string; name: string }) => (
                    <Badge key={i.id} variant="secondary">
                      {i.name}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            <p className="sr-only">{displayName}</p>
          </div>
        )}
      </div>
    </div>
  )
}
