'use client'

import { Crosshair, Minus, Plus, RotateCcw } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Carte de France zoomable : uniquement des petits boutons « nom de ville ».
 * - zoom 1 : les grandes villes ;
 * - zoom ≥ 1.8 : villes moyennes supplémentaires ;
 * - zoom ≥ 2.8 : villes du Var / Côte d'Azur (jamais chevauchées grâce aux
 *   décalages verticaux alternés).
 * Choisir une ville localise le fil manuellement — la géoloc GPS reste possible.
 */

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
  /** Niveau d'apparition : 1 = toujours, 2 = zoom ≥ 1.8, 3 = zoom ≥ 2.8 */
  tier: 1 | 2 | 3
  /** Décalage visuel du bouton (px) — évite tout chevauchement */
  dx?: number
  dy?: number
}

export const MAP_CITIES: MapCity[] = [
  // --- Niveau 1 : grandes villes, bien espacées ---
  { name: 'Lille', lat: 50.63, lon: 3.06, tier: 1 },
  { name: 'Paris', lat: 48.86, lon: 2.35, tier: 1 },
  { name: 'Strasbourg', lat: 48.58, lon: 7.75, tier: 1 },
  { name: 'Rennes', lat: 48.11, lon: -1.68, tier: 1 },
  { name: 'Nantes', lat: 47.22, lon: -1.55, tier: 1 },
  { name: 'Bordeaux', lat: 44.84, lon: -0.58, tier: 1 },
  { name: 'Toulouse', lat: 43.6, lon: 1.44, tier: 1 },
  { name: 'Lyon', lat: 45.76, lon: 4.84, tier: 1 },
  { name: 'Marseille', lat: 43.3, lon: 5.37, tier: 1, dy: 24 },
  // --- Niveau 2 : villes moyennes (zoom ≥ 1.8) ---
  { name: 'Montpellier', lat: 43.61, lon: 3.88, tier: 2 },
  { name: 'Grenoble', lat: 45.19, lon: 5.72, tier: 2 },
  { name: 'Avignon', lat: 43.95, lon: 4.81, tier: 2 },
  { name: 'Toulon', lat: 43.12, lon: 5.93, tier: 2, dy: -26 },
  { name: 'Fréjus', lat: 43.43, lon: 6.74, tier: 2, dy: -26 },
  { name: 'Cannes', lat: 43.55, lon: 7.01, tier: 2, dy: 26 },
  { name: 'Nice', lat: 43.7, lon: 7.26, tier: 2, dy: -26 },
  { name: 'Nîmes', lat: 43.84, lon: 4.36, tier: 2, dy: 24 },
  { name: 'Perpignan', lat: 42.7, lon: 2.9, tier: 2 },
  { name: 'Pau', lat: 43.3, lon: -0.37, tier: 2 },
  { name: 'Limoges', lat: 45.83, lon: 1.26, tier: 2 },
  { name: 'Clermont-Ferrand', lat: 45.78, lon: 3.08, tier: 2 },
  { name: 'Dijon', lat: 47.32, lon: 5.04, tier: 2 },
  { name: 'Annecy', lat: 45.9, lon: 6.13, tier: 2 },
  { name: 'Tours', lat: 47.39, lon: 0.69, tier: 2 },
  { name: 'Orléans', lat: 47.9, lon: 1.9, tier: 2 },
  { name: 'Reims', lat: 49.26, lon: 4.03, tier: 2 },
  { name: 'Metz', lat: 49.12, lon: 6.18, tier: 2 },
  { name: 'Nancy', lat: 48.69, lon: 6.18, tier: 2, dy: 24 },
  { name: 'Amiens', lat: 49.89, lon: 2.3, tier: 2 },
  { name: 'Rouen', lat: 49.44, lon: 1.1, tier: 2 },
  { name: 'Brest', lat: 48.39, lon: -4.49, tier: 2 },
  { name: 'Angers', lat: 47.47, lon: -0.55, tier: 2 },
  { name: 'Ajaccio', lat: 41.92, lon: 8.74, tier: 2 },
  // --- Niveau 3 : Var & Côte d'Azur (zoom ≥ 2.8) ---
  { name: 'Antibes', lat: 43.58, lon: 7.12, tier: 3, dy: -26 },
  { name: 'Grasse', lat: 43.66, lon: 6.92, tier: 3, dy: -60 },
  { name: 'Sainte-Maxime', lat: 43.31, lon: 6.64, tier: 3, dy: -26 },
  { name: 'Saint-Raphaël', lat: 43.43, lon: 6.77, tier: 3, dy: 26 },
  { name: 'Draguignan', lat: 43.54, lon: 6.46, tier: 3, dy: -56 },
  { name: 'Hyères', lat: 43.12, lon: 6.13, tier: 3, dy: 26 },
  { name: 'La Seyne-sur-Mer', lat: 43.1, lon: 5.88, tier: 3, dy: 26 },
  { name: 'Brignoles', lat: 43.41, lon: 6.06, tier: 3, dy: -20 },
]

const ZOOMS = [1, 1.8, 2.8, 3.8]

/** Carte de France : boutons villes cliquables, zoom et déplacement. */
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
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const maxPan = ((zoom - 1) * SIZE) / 2
  const clamp = (v: number) => Math.max(-maxPan, Math.min(maxPan, v))

  const zoomTo = useCallback((z: number) => {
    setZoom(z)
    setPan((p) => ({ x: Math.max(-((z - 1) * SIZE) / 2, Math.min(((z - 1) * SIZE) / 2, p.x)), y: Math.max(-((z - 1) * SIZE) / 2, Math.min(((z - 1) * SIZE) / 2, p.y)) }))
  }, [])

  const zoomIn = () => zoomTo(ZOOMS.find((z) => z > zoom + 0.01) ?? 3.8)
  const zoomOut = () => zoomTo([...ZOOMS].reverse().find((z) => z < zoom - 0.01) ?? 1)

  const visibleCities = MAP_CITIES.filter(
    (c) => c.tier === 1 || (c.tier === 2 && zoom >= 1.75) || (c.tier === 3 && zoom >= 2.75),
  )

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
          {(selected || zoom > 1) && (
            <button
              type="button"
              onClick={() => {
                onReset()
                zoomTo(1)
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-danger-500 transition-colors hover:border-danger-300"
            >
              <RotateCcw className="h-3 w-3" aria-hidden /> Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div
        className={cn(
          'relative mx-auto aspect-square w-full max-w-sm touch-none select-none overflow-hidden rounded-xl bg-primary-50/40 dark:bg-primary-950/20',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        onPointerDown={(e) => {
          if (zoom <= 1) return
          drag.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
          setDragging(true)
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          setPan({
            x: clamp(drag.current.panX + (e.clientX - drag.current.startX)),
            y: clamp(drag.current.panY + (e.clientY - drag.current.startY)),
          })
        }}
        onPointerUp={() => {
          drag.current = null
          setDragging(false)
        }}
        onPointerCancel={() => {
          drag.current = null
          setDragging(false)
        }}
        onWheel={(e) => {
          if (e.deltaY < 0) zoomIn()
          else zoomOut()
        }}
      >
        {/* Couche zoomable : contours + villes */}
        <div
          className="absolute inset-0 transition-transform duration-200"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          <svg
            viewBox="0 0 520 520"
            role="img"
            aria-label="Carte de France avec les villes cliquables"
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

          {visibleCities.map((c) => {
            const active = selected === c.name
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => onSelect(c)}
                aria-pressed={active}
                aria-label={`Voir les plans autour de ${c.name}`}
                className={cn(
                  'absolute whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[9px] font-bold leading-none shadow-sm transition-colors',
                  active
                    ? 'border-primary-700 bg-primary-600 text-white'
                    : 'border-primary-300 bg-card/95 text-fg hover:border-primary-500 hover:text-primary-700 dark:border-primary-800 dark:bg-card/90',
                )}
                style={{
                  left: `${(px(c.lon) / SIZE) * 100}%`,
                  top: `${(py(c.lat) / SIZE) * 100}%`,
                  transform: `translate(-50%, -50%) translate(${c.dx ?? 0}px, ${c.dy ?? 0}px) scale(${1 / zoom})`,
                }}
              >
                {c.name}
              </button>
            )
          })}
        </div>

        {/* Contrôles de zoom */}
        <div className="absolute right-2 top-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= 3.79}
            aria-label="Zoomer"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/95 font-bold shadow-sm transition-colors hover:bg-bg-secondary disabled:opacity-40"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= 1}
            aria-label="Dézoomer"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/95 font-bold shadow-sm transition-colors hover:bg-bg-secondary disabled:opacity-40"
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {zoom > 1 && (
          <p className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2 py-0.5 text-[9px] font-semibold text-white">
            Glissez pour déplacer · molette pour zoomer
          </p>
        )}
      </div>

      <p className="mt-1.5 text-center text-[11px] text-fg-muted">
        Zoomez pour découvrir plus de villes. Une ville choisie affiche aussi les plans des
        communes voisines (25 km alentour).
      </p>
    </div>
  )
}
