'use client'

import { Crosshair, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Carte de France métropolitaine simplifiée (contours en lat/lon projetés).
 * Les grandes villes sont des boutons cliquables : choisir une ville localise
 * le fil manuellement — la géolocalisation GPS reste disponible à côté.
 */

// Boîte englobante + projection linéaire corrigée du cosinus de latitude
const LON0 = -5.2
const LON1 = 9.8
const LAT0 = 41.0
const LAT1 = 51.4
const COS46 = 0.695
const SIZE = 520
const S = SIZE / ((LON1 - LON0) * COS46)

const px = (lon: number) => (lon - LON0) * COS46 * S
const py = (lat: number) => (LAT1 - lat) * S

/** Contour simplifié de la France métropolitaine (lon, lat). */
const OUTLINE: [number, number][] = [
  [2.38, 51.05], [1.6, 50.9], [1.5, 50.15], [0.2, 49.7], [-1.05, 49.72],
  [-1.62, 49.7], [-1.9, 49.4], [-1.62, 48.85], [-2.05, 48.65], [-2.75, 48.55],
  [-3.55, 48.72], [-4.4, 48.45], [-4.75, 48.15], [-4.2, 47.85], [-3.4, 47.72],
  [-2.8, 47.58], [-2.15, 47.25], [-1.8, 46.5], [-1.15, 46.15], [-1.05, 45.6],
  [-1.25, 45.2], [-1.15, 44.65], [-1.4, 43.9], [-1.56, 43.48], [-0.7, 42.8],
  [0.65, 42.7], [1.45, 42.45], [2.65, 42.35], [3.03, 42.43], [3.9, 43.45],
  [4.45, 43.38], [5.35, 43.3], [5.93, 43.12], [6.64, 43.27], [7.01, 43.55],
  [7.5, 43.78], [7.1, 44.2], [6.7, 45.0], [6.87, 45.83], [6.1, 46.4],
  [6.5, 46.8], [7.0, 47.42], [7.58, 47.58], [7.62, 48.05], [7.75, 48.58],
  [8.22, 49.0], [7.0, 49.12], [6.35, 49.47], [5.8, 49.55], [5.2, 49.7],
  [4.35, 49.98], [3.6, 50.35], [3.1, 50.65], [2.55, 50.8], [2.38, 51.05],
]

const CORSICA: [number, number][] = [
  [9.4, 43.0], [9.55, 42.15], [9.35, 41.38], [8.8, 41.55], [8.6, 42.0],
  [8.55, 42.4], [9.0, 42.7], [9.4, 43.0],
]

const toPath = (pts: [number, number][]) =>
  pts.map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'}${px(lon).toFixed(1)},${py(lat).toFixed(1)}`).join(' ') + ' Z'

export interface MapCity {
  name: string
  lat: number
  lon: number
  /** Décalage du libellé (px SVG) pour éviter les collisions */
  dx?: number
  dy?: number
  /** Alignement du texte du libellé */
  anchor?: 'start' | 'end'
}

/** Grandes villes de France (clic = localisation manuelle du fil). */
export const MAP_CITIES: MapCity[] = [
  { name: 'Lille', lat: 50.63, lon: 3.06 },
  { name: 'Paris', lat: 48.86, lon: 2.35, dx: 10, dy: -6 },
  { name: 'Strasbourg', lat: 48.58, lon: 7.75 },
  { name: 'Rennes', lat: 48.11, lon: -1.68 },
  { name: 'Nantes', lat: 47.22, lon: -1.55, dy: 16 },
  { name: 'Bordeaux', lat: 44.84, lon: -0.58 },
  { name: 'Toulouse', lat: 43.6, lon: 1.44 },
  { name: 'Montpellier', lat: 43.61, lon: 3.88, dy: 16 },
  { name: 'Lyon', lat: 45.76, lon: 4.84 },
  { name: 'Grenoble', lat: 45.19, lon: 5.72, dx: 10 },
  { name: 'Avignon', lat: 43.95, lon: 4.81, anchor: 'end', dx: -10 },
  { name: 'Marseille', lat: 43.3, lon: 5.37, anchor: 'end', dx: -10 },
  { name: 'Toulon', lat: 43.12, lon: 5.93, dx: 8, dy: 14 },
  { name: 'Fréjus', lat: 43.43, lon: 6.74, anchor: 'end', dx: -10 },
  { name: 'Cannes', lat: 43.55, lon: 7.01, anchor: 'end', dx: -10 },
  { name: 'Nice', lat: 43.7, lon: 7.26, dx: 8, dy: -6 },
]

/** Carte de France cliquable + position GPS + réinitialisation. */
export function FranceMap({
  selected,
  onSelect,
  onReset,
  onGps,
  gpsActive,
}: {
  selected: string | null
  onSelect: (city: MapCity) => void
  onReset: () => void
  onGps: () => void
  gpsActive: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-fg-muted">
          <Crosshair className="h-4 w-4 text-primary-600" aria-hidden />
          {selected ? `Plans autour de ${selected}` : 'Où cherchez-vous ? Touchez une ville'}
        </h2>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onGps}
            aria-pressed={gpsActive}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
              gpsActive
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-border bg-card text-fg-muted hover:border-primary-300 hover:text-fg',
            )}
          >
            <Crosshair className="h-3 w-3" aria-hidden /> Ma position GPS
          </button>
          {selected && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-danger-500 transition-colors hover:border-danger-300"
            >
              <X className="h-3 w-3" aria-hidden /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-sm select-none">
        <svg
          viewBox="0 0 520 520"
          role="img"
          aria-label="Carte de France avec les grandes villes cliquables"
          className="h-full w-full"
        >
          <path
            d={toPath(OUTLINE)}
            className="fill-primary-50 stroke-primary-300 dark:fill-primary-950/50 dark:stroke-primary-800"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d={toPath(CORSICA)}
            className="fill-primary-50 stroke-primary-300 dark:fill-primary-950/50 dark:stroke-primary-800"
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </svg>

        {/* Villes cliquables */}
        {MAP_CITIES.map((c) => {
          const active = selected === c.name
          return (
            <button
              key={c.name}
              type="button"
              onClick={() => onSelect(c)}
              aria-pressed={active}
              aria-label={`Voir les plans autour de ${c.name}`}
              className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center"
              style={{ left: `${(px(c.lon) / SIZE) * 100}%`, top: `${(py(c.lat) / SIZE) * 100}%` }}
            >
              <span
                className={cn(
                  'block h-3 w-3 shrink-0 rounded-full border-2 border-white shadow transition-colors',
                  active ? 'bg-primary-600' : 'bg-secondary-500 hover:bg-primary-500',
                )}
                aria-hidden
              />
              <span
                className={cn(
                  'pointer-events-none absolute whitespace-nowrap text-[9px] font-bold leading-none sm:text-[10px]',
                  active ? 'text-primary-700 dark:text-primary-300' : 'text-fg-muted',
                )}
                style={{
                  left: (c.dx ?? 8) >= 0 ? `${8 + (c.dx ?? 8)}px` : undefined,
                  right: (c.dx ?? 8) < 0 ? `${8 - (c.dx ?? 8)}px` : undefined,
                  top: c.dy ? `${c.dy - 4}px` : undefined,
                  transform: c.dy ? undefined : 'translateY(-50%)',
                }}
              >
                {c.name}
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-1 text-center text-[11px] text-fg-muted">
        Astuce : une ville choisie affiche aussi les plans des communes voisines (25 km alentour).
      </p>
    </div>
  )
}
