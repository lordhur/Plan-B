'use client'

import { List, Map as MapIcon, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { EventCard } from '@/components/events/EventCard'
import { EventFilters, type Filters } from '@/components/events/EventFilters'
import { EventMap } from '@/components/events/EventMap'
import { EmptyState } from '@/components/common/EmptyState'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type View = 'list' | 'map'

/** EXPLORER — carte + liste des événements proches. */
export default function ExplorePage() {
  const { user } = useCurrentUser()
  const [view, setView] = useState<View>('list')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Filters>({ sort: 'relevance' })
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)

  useEffect(() => {
    if (coords || !navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {},
      { timeout: 8000, maximumAge: 300000 },
    )
  }, [coords])

  const latitude = coords?.lat ?? user?.latitude ?? null
  const longitude = coords?.lon ?? user?.longitude ?? null
  const hasLocation = latitude != null && longitude != null

  const { data, isLoading } = trpc.events.search.useQuery({
    latitude: latitude ?? undefined,
    longitude: longitude ?? undefined,
    maxDistanceKm: filters.maxDistanceKm ?? (hasLocation ? 50 : undefined),
    categoryId: filters.categoryId,
    search: search || undefined,
    isFree: filters.isFree,
    wheelchairAccessible: filters.wheelchairAccessible,
    dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
    dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    sort: filters.sort,
    limit: 30,
  })

  const mapEvents = useMemo(
    () => (data?.results ?? []).map((r) => r.event),
    [data],
  )
  const results = data?.results ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Explorer</h1>
          <p className="text-sm text-fg-muted">
            {data ? `${data.total} plan${data.total > 1 ? 's' : ''} à venir` : 'Chargement…'}
            {hasLocation && ' près de vous'}
          </p>
        </div>

        {/* Bascule liste / carte */}
        <div
          role="tablist"
          aria-label="Mode d'affichage"
          className="flex rounded-xl border border-border p-1"
        >
          {(
            [
              ['list', List, 'Liste'],
              ['map', MapIcon, 'Carte'],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={view === value}
              onClick={() => setView(value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                view === value ? 'bg-primary-600 text-white' : 'text-fg-muted hover:text-fg',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" aria-hidden />
        <Input
          className="pl-10"
          placeholder="Rechercher un plan, une ville, un tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Rechercher un événement"
        />
      </div>

      <EventFilters filters={filters} onChange={setFilters} hasLocation={hasLocation} />

      {view === 'map' ? (
        <div className="h-[60vh] overflow-hidden rounded-2xl border border-border">
          <EventMap
            events={mapEvents as never}
            center={hasLocation ? [latitude!, longitude!] : undefined}
            zoom={hasLocation ? 11 : 10}
            className="h-full w-full"
          />
        </div>
      ) : isLoading ? (
        <div className="grid gap-4" aria-label="Chargement">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {results.map((item) => (
            <EventCard
              key={item.event.id}
              event={item.event as never}
              distanceKm={item.distanceKm}
              readOnly
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="Aucun plan ne correspond"
          description="Élargissez la distance, changez de catégorie ou réinitialisez les filtres."
        />
      )}
    </div>
  )
}
