'use client'

import { Camera, Compass, Loader2, MapPin, Sparkles, Video } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { EventCard } from '@/components/events/EventCard'
import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { FranceMap } from '@/components/map/FranceMap'

/** FIL D'ACTUALITÉ — plans à venir, géolocalisés et classés par pertinence. */
export default function FeedPage() {
  const { user, isLoading: userLoading, isAuthenticated } = useCurrentUser()
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [cityFilter, setCityFilter] = useState<{ name: string; lat: number; lon: number } | null>(null)
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'ok' | 'denied'>('idle')

  // Géolocalisation navigateur (avec repli sur la ville du profil)
  useEffect(() => {
    if (!isAuthenticated || coords || geoState !== 'idle') return
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
  }, [isAuthenticated, coords, geoState])

  const feedLat = cityFilter?.lat ?? coords?.lat ?? user?.latitude ?? null
  const feedLon = cityFilter?.lon ?? coords?.lon ?? user?.longitude ?? null

  const { data, isLoading } = trpc.events.feed.useQuery({
    latitude: feedLat,
    longitude: feedLon,
    limit: 30,
  })

  // Dernières photos/vidéos publiées sur les plans
  const recentMedia = trpc.albums.recent.useQuery({ limit: 12 })

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const firstName = user?.firstName

  const loading = isLoading || userLoading

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* En-tête de bienvenue */}
      <section aria-label="Bienvenue">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {isAuthenticated && firstName ? `${greeting}, ${firstName} 👋` : `${greeting} 👋`}
        </h1>
        <p className="mt-1 text-fg-muted">Qu’est-ce qu’on fait aujourd’hui ?</p>

        {!isAuthenticated && !userLoading && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/register">Créer mon compte</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/explore">Explorer les plans</Link>
            </Button>
          </div>
        )}

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
      </section>

      {/* Carte de France — localisation manuelle sans géoloc obligatoire */}
      <section aria-labelledby="feed-cities">
        <FranceMap
          selected={cityFilter?.name ?? null}
          onSelect={(c) => setCityFilter((prev) => (prev?.name === c.name ? null : { name: c.name, lat: c.lat, lon: c.lon }))}
          onReset={() => setCityFilter(null)}
          onGps={() => {
            if (!navigator.geolocation) return
            setGeoState('loading')
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
                setCityFilter(null)
                setGeoState('ok')
              },
              () => setGeoState('denied'),
              { timeout: 8000, maximumAge: 300000 },
            )
          }}
          gpsActive={geoState === 'ok' && !cityFilter}
        />
      </section>

      {/* Pellicule des dernières photos/vidéos */}
      {recentMedia.data && recentMedia.data.length > 0 && (
        <section aria-labelledby="feed-media">
          <h2 id="feed-media" className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Camera className="h-5 w-5 text-secondary-500" aria-hidden />
            En images
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

      {/* Plans près de vous */}
      <section aria-labelledby="feed-near">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="feed-near" className="flex items-center gap-2 text-lg font-bold">
            <MapPin className="h-5 w-5 text-primary-600" aria-hidden />
            {cityFilter ? `Autour de ${cityFilter.name}` : 'Autour de vous'}
            {!cityFilter && coords && (
              <span className="text-sm font-medium text-fg-muted">· position GPS</span>
            )}
          </h2>
        </div>
        {loading ? (
          <FeedSkeletons />
        ) : data && data.near.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-1">
            {data.near.map((item, i) => (
              <EventCard
                key={item.event.id}
                event={item.event as never}
                distanceKm={item.distanceKm}
                index={i}
                myStatus={item.myStatus}
                isOrganizer={item.isOrganizer}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MapPin}
            title="Aucun plan dans les 25 km"
            description={
              geoState === 'denied'
                ? 'La géolocalisation est refusée — activez-la ou explorez par ville.'
                : 'Les plans arrivent vite ! Explorez la carte ou créez le vôtre.'
            }
            action={
              <div className="flex gap-2">
                <Button asChild>
                  <Link href="/events/create">Créer un plan</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/explore">Explorer</Link>
                </Button>
              </div>
            }
          />
        )}
      </section>

      {/* Pour vous */}
      {data && data.forYou.length > 0 && (
        <section aria-labelledby="feed-foryou">
          <h2 id="feed-foryou" className="mb-3 flex items-center gap-2 text-lg font-bold">
            <Sparkles className="h-5 w-5 text-secondary-500" aria-hidden />
            Pour vous
          </h2>
          <div className="grid gap-4">
            {data.forYou.map((item, i) => (
              <EventCard
                key={item.event.id}
                event={item.event as never}
                distanceKm={item.distanceKm}
                index={i}
                myStatus={item.myStatus}
                isOrganizer={item.isOrganizer}
              />
            ))}
          </div>
        </section>
      )}

      {!loading && (!data || (data.near.length === 0 && data.forYou.length === 0)) && (
        <EmptyState
          icon={Compass}
          title="Le calme avant la tempête"
          description="Aucun plan à venir pour le moment. Soyez le premier à lancer le mouvement !"
          action={
            <Button asChild>
              <Link href="/events/create">Créer le premier plan</Link>
            </Button>
          }
        />
      )}
    </div>
  )
}

function FeedSkeletons() {
  return (
    <div className="grid gap-4" aria-label="Chargement des plans">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-border p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-5 w-3/4" />
          <Skeleton className="mt-4 h-4 w-1/2" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <div className="mt-5 flex gap-2">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
