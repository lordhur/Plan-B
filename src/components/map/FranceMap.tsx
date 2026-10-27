'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Carte interactive v3 : régions → départements → villes (Leaflet + GeoJSON
 * officiels), avec bouton « Valider » qui filtre plans et membres par zone.
 */
const RegionsMapInner = dynamic(() =>
  import('./RegionsMapInner').then((m) => m.RegionsMapInner), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <Skeleton className="mb-2 h-5 w-48" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  ),
})

export function FranceMap() {
  return <RegionsMapInner />
}
