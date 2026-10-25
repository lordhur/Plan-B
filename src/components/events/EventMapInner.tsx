'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import { formatEventDateShort } from '@/lib/date'

/** Marqueur SVG coloré par catégorie (pas d'images externes). */
function categoryIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="planb-marker" style="background:${color}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  })
}

export interface MapEvent {
  id: string
  slug: string
  title: string
  latitude: number
  longitude: number
  startDate: Date | string
  city: string
  currentParticipants: number
  maxParticipants: number | null
  category: { color: string; name: string }
}

interface EventMapProps {
  events: MapEvent[]
  center?: [number, number]
  zoom?: number
  className?: string
  /** Recentre la carte quand `center` change. */
  recenterKey?: string
}

function Recenter({ center, zoom }: { center?: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

/** Carte Leaflet + OpenStreetMap — client uniquement (chargé via next/dynamic). */
export function EventMapInner({ events, center, zoom = 12, className, recenterKey }: EventMapProps) {
  const router = useRouter()
  const defaultCenter = useMemo<[number, number]>(() => center ?? [43.5377, 6.4643], [center])
  const icons = useMemo(() => {
    const cache = new Map<string, L.DivIcon>()
    return (color: string) => {
      if (!cache.has(color)) cache.set(color, categoryIcon(color))
      return cache.get(color)!
    }
  }, [])

  return (
    <div className={className}>
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom
        aria-label="Carte des événements"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={center} zoom={zoom} key={recenterKey} />
        {events.map((event) => (
          <Marker
            key={event.id}
            position={[event.latitude, event.longitude]}
            icon={icons(event.category.color)}
          >
            <Popup>
              <div className="min-w-44">
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: event.category.color }}>
                  {event.category.name}
                </p>
                <p className="mt-0.5 text-sm font-bold leading-tight">{event.title}</p>
                <p className="mt-1 text-xs opacity-70">
                  {formatEventDateShort(event.startDate)} · {event.city}
                </p>
                <p className="mt-0.5 text-xs opacity-70">
                  {event.currentParticipants}
                  {event.maxParticipants != null ? `/${event.maxParticipants}` : ''} participants
                </p>
                <button
                  onClick={() => router.push(`/events/${event.slug}`)}
                  className="mt-2 w-full rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                >
                  Voir le plan
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

