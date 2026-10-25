'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import type { MapEvent } from './EventMapInner'

// Leaflet accède à `window` au chargement du module → client uniquement
const EventMapInner = dynamic(
  () => import('./EventMapInner').then((m) => m.EventMapInner),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" aria-label="Chargement de la carte" />,
  },
)

interface EventMapProps {
  events: MapEvent[]
  center?: [number, number]
  zoom?: number
  className?: string
  recenterKey?: string
}

/** Carte Leaflet + OpenStreetMap (gratuit, sans clé API) — SSR-safe. */
export function EventMap(props: EventMapProps) {
  return <EventMapInner {...props} />
}

export type { MapEvent }
