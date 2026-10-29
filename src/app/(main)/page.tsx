'use client'

import { Camera, Compass, MapPin, Sparkles, Video, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { EventCard } from '@/components/events/EventCard'
import { IntroCardView, type IntroCardItem } from '@/components/friends/IntroCardView'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { FranceMap } from '@/components/map/FranceMap'
import { StoryRail } from '@/components/stories/StoryRail'
import { syncGeoFromStorage, useLocationFilter } from '@/lib/locationFilter'
import { useLang } from '@/lib/i18n'

/** FIL D'ACTUALITÉ — plans à venir, géolocalisés et classés par pertinence. */
export default function FeedPage() {
  const { t } = useLang()
  const { user, isLoading: userLoading, isAuthenticated } = useCurrentUser()
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'ok' | 'denied'>('idle')
  const { filter, clear, radiusKm } = useLocationFilter()

  // Rayon mémorisé (km) relu côté client — évite tout décalage d'hydratation
  useEffect(() => {
    syncGeoFromStorage()
  }, [])

  // Géolocalisation navigateur (avec repli sur la ville du profil)
  useEffect(() => {
    if (!isAuthenticated || coords || geoState !== 'idle' || filter) return
    if (!navigator.geolocation) return
    setGeoState('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        setGeoState('ok')
      },
      () => setGeoState('denied'),
      { timeout: 8000, maximumAge: 300000 },
    )
  }, [isAuthenticated, coords, geoState, filter])

  // Coordonnées effectives : zone validée (ville/GPS) > GPS navigateur > profil
  const zoneLat = filter?.type === 'city' ? filter.lat : null
  const zoneLon = filter?.type === 'city' ? filter.lon : null
  const feedLat = zoneLat ?? coords?.lat ?? user?.latitude ?? null
  const feedLon = zoneLon ?? coords?.lon ?? user?.longitude ?? null

  // Filtre par zone (région / département) : requête par cadre géographique
  const zoneBox = filter && (filter.type === 'region' || filter.type === 'dept') ? filter : null
  const boxQuery = trpc.events.inBox.useQuery(
    {
      minLat: zoneBox?.bbox.minLat ?? 0,
      maxLat: zoneBox?.bbox.maxLat ?? 0,
      minLon: zoneBox?.bbox.minLon ?? 0,
      maxLon: zoneBox?.bbox.maxLon ?? 0,
      limit: 36,
    },
    { enabled: !!zoneBox },
  )

  const feedQuery = trpc.events.feed.useQuery(
    { latitude: feedLat, longitude: feedLon, limit: 30, radiusKm },
    { enabled: !zoneBox },
  )

  // Fiche de présentation rotative (20 s, départ aléatoire)
  const introCards = trpc.introCards.list.useQuery()
  const introList = introCards.data ?? []
  const [introIndex, setIntroIndex] = useState(() => Math.floor(Math.random() * 100))
  useEffect(() => {
    if (introList.length < 2) return
    const t = setInterval(() => setIntroIndex((i) => i + 1), 20000)
    return () => clearInterval(t)
  }, [introList.length])
  const introCard = useMemo(
    () => (introList.length > 0 ? introList[introIndex % introList.length] : null),
    [introList, introIndex],
  )

  // Dernières photos/vidéos publiées sur les plans
  const recentMedia = trpc.albums.recent.useQuery({ limit: 12 })

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? t('feed_morning') : hour < 18 ? t('feed_afternoon') : t('feed_evening')
  const firstName = user?.firstName

  const loading = zoneBox ? boxQuery.isLoading : feedQuery.isLoading || userLoading

  // Liste unifiée selon le mode
  const nearItems = useMemo(() => {
    if (zoneBox) {
      return (boxQuery.data ?? []).map((e) => ({
        event: e.event,
        distanceKm: null as number | null,
        myStatus: e.myStatus,
        myWaitlistPosition: e.myWaitlistPosition,
        isOrganizer: e.isOrganizer,
        liked: e.liked,
        likes: (e.event as { _count?: { likes?: number } })._count?.likes ?? 0,
      }))
    }
    return (feedQuery.data?.near ?? []) as unknown as Array<{
      event: { id: string; _count?: { likes?: number } }
      distanceKm: number | null
      myStatus: string | null
      myWaitlistPosition: number | null
      isOrganizer: boolean
      liked: boolean
    }>
  }, [zoneBox, boxQuery.data, feedQuery.data])

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* En-tête de bienvenue — masqué sur mobile : la maquette démarre sur les stories */}
      <section aria-label="Bienvenue" className="hidden md:block">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {isAuthenticated && firstName ? `${greeting}, ${firstName} 👋` : `${greeting} 👋`}
        </h1>
        <p className="mt-1 text-fg-muted">Qu’est-ce qu’on fait aujourd’hui ?</p>

        {!isAuthenticated && !userLoading && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/register">{t('feed_create_account')}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/events/calendar">{t('feed_see_plans')}</Link>
            </Button>
          </div>
        )}
      </section>

      {/* Stories (24 h) — moi + mes amis, juste sous l'en-tête */}
      <StoryRail />

      {isAuthenticated && user && !user.emailVerified && (
        <div className="mt-4 rounded-xl border border-warning-500/40 bg-warning-50 p-4 text-sm dark:bg-warning-500/10">
          <p className="font-semibold text-warning-600">Vérifiez votre email 📬</p>
          <p className="mt-0.5 text-fg-muted">
            Votre compte n’est pas encore actif : vous ne pouvez pas créer ni rejoindre de plans.
          </p>
          <Button asChild size="sm" className="mt-3">
            <Link href="/verify">Vérifier maintenant</Link>
          </Button>
        </div>
      )}

      {/* Carte régions → départements → villes + bouton Valider */}
      <section aria-labelledby="feed-map">
        <FranceMap />
      </section>

      {/* Zone validée */}
      {filter && (
        <div className="flex items-center justify-between rounded-xl border border-primary-500/40 bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden />
            {t('feed_zone')} : {filter.name}
            {filter.type === 'city' ? ` (${radiusKm} km autour)` : ''}
          </span>
          <button
            type="button"
            onClick={clear}
            className="ml-3 rounded-lg p-1 hover:bg-primary-500/20"
            aria-label="Retirer le filtre géographique"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      {/* Fiche de présentation rotative — départ aléatoire, rotation 20 s */}
      {introCard && (
        <section aria-labelledby="feed-intro">
          <h2 id="feed-intro" className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Sparkles className="h-5 w-5 text-secondary-500" aria-hidden />
            {t('feed_intro')}
          </h2>
          <div
            key={introCard.id}
            className="duration-500 animate-in fade-in slide-in-from-bottom-1"
          >
            <IntroCardView card={introCard as IntroCardItem} />
          </div>
        </section>
      )}

      {/* Pellicule des dernières photos/vidéos */}
      {recentMedia.data && recentMedia.data.length > 0 && (
        <section aria-labelledby="feed-media">
          <h2 id="feed-media" className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Camera className="h-5 w-5 text-secondary-500" aria-hidden />
            {t('feed_media')}
          </h2>
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
            {recentMedia.data.map((m) => (
              <Link
                key={m.id}
                href={`/events/${m.event.slug}`}
                className="card-sheen group relative h-28 w-40 shrink-0 overflow-hidden rounded-xl border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.thumbnailUrl}
                  alt={m.caption ?? `Photo de ${m.event.title}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {m.type === 'VIDEO' && (
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 p-1 text-white">
                    <Video className="h-3 w-3" aria-hidden />
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-5 text-[11px] font-semibold text-white">
                  {m.event.city} · {m.event.title}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Plans — 3 par ligne sur grand écran */}
      <section aria-labelledby="feed-near">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="feed-near" className="flex items-center gap-2 text-lg font-bold">
            <MapPin className="h-5 w-5 text-primary-600" aria-hidden />
            {zoneBox
              ? `${t('feed_in_zone')} ${zoneBox.name}`
              : filter?.type === 'city'
                ? `${t('feed_around')} ${filter.name}`
                : t('feed_near_you')}
            {!filter && coords && (
              <span className="text-sm font-medium text-fg-muted">
                · {t('feed_gps')} · {radiusKm} km
              </span>
            )}
          </h2>
        </div>
        {loading ? (
          <FeedSkeletons />
        ) : nearItems.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nearItems.map((item, i) => (
              <EventCard
                key={item.event.id}
                event={item.event as never}
                distanceKm={item.distanceKm}
                index={i}
                myStatus={item.myStatus}
                isOrganizer={item.isOrganizer}
                liked={item.liked}
                likes={(item.event as { _count?: { likes?: number } })._count?.likes ?? 0}
                waitlistPosition={item.myWaitlistPosition}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MapPin}
            title={
              zoneBox
                ? `${t('feed_empty_zone')} ${zoneBox.name}`
                : t('feed_empty_near').replace('{km}', String(radiusKm))
            }
            description={
              geoState === 'denied' && !filter ? t('feed_empty_desc_denied') : t('feed_empty_desc')
            }
            action={
              <div className="flex gap-2">
                <Button asChild>
                  <Link href="/events/create">{t('create_plan_btn')}</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/events/calendar">{t('see_activity')}</Link>
                </Button>
              </div>
            }
          />
        )}
      </section>

      {/* Pour vous */}
      {!zoneBox && feedQuery.data && feedQuery.data.forYou.length > 0 && (
        <section aria-labelledby="feed-foryou">
          <h2 id="feed-foryou" className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Sparkles className="h-5 w-5 text-secondary-500" aria-hidden />
            {t('feed_for_you')}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {feedQuery.data.forYou.map((item, i) => (
              <EventCard
                key={item.event.id}
                event={item.event as never}
                distanceKm={item.distanceKm}
                index={i}
                myStatus={item.myStatus}
                isOrganizer={item.isOrganizer}
                liked={item.liked}
                likes={(item.event as { _count?: { likes?: number } })._count?.likes ?? 0}
                waitlistPosition={item.myWaitlistPosition}
              />
            ))}
          </div>
        </section>
      )}

      {!loading &&
        nearItems.length === 0 &&
        (!feedQuery.data || feedQuery.data.forYou.length === 0) && (
          <EmptyState
            icon={Compass}
            title={t('feed_calm')}
            description={t('feed_calm_desc')}
            action={
              <Button asChild>
                <Link href="/events/create">{t('first_plan')}</Link>
              </Button>
            }
          />
        )}
    </div>
  )
}

function FeedSkeletons() {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Chargement des plans"
    >
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-border p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-5 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}
