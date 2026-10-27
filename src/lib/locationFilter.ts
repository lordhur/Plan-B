import { create } from 'zustand'

export interface BBox {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

export type LocationFilter =
  | { type: 'region' | 'dept'; name: string; bbox: BBox }
  | { type: 'city'; name: string; lat: number; lon: number }
  | null

/** Rayon par défaut autour d'une ville / de la position GPS (km). */
export const DEFAULT_RADIUS_KM = 25
export const MIN_RADIUS_KM = 1
export const MAX_RADIUS_KM = 150

interface LocationStore {
  filter: LocationFilter
  /** Rayon de recherche autour de la ville / position GPS (km). */
  radiusKm: number
  setFilter: (f: LocationFilter) => void
  setRadiusKm: (km: number) => void
  clear: () => void
}

const STORAGE_KEY = 'planb_radius_km'

function initialRadius(): number {
  if (typeof window === 'undefined') return DEFAULT_RADIUS_KM
  const saved = Number(window.localStorage.getItem(STORAGE_KEY))
  return Number.isFinite(saved) && saved >= MIN_RADIUS_KM && saved <= MAX_RADIUS_KM
    ? saved
    : DEFAULT_RADIUS_KM
}

/** Filtre géographique partagé : la carte le définit, le fil et les membres le suivent. */
export const useLocationFilter = create<LocationStore>((set) => ({
  filter: null,
  radiusKm: DEFAULT_RADIUS_KM,
  setFilter: (filter) => set({ filter }),
  setRadiusKm: (radiusKm) => {
    const clamped = Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, Math.round(radiusKm)))
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(clamped))
      } catch {
        /* stockage indisponible */
      }
    }
    set({ radiusKm: clamped })
  },
  clear: () => set({ filter: null }),
}))

/** Le rayon mémorisé est relu au montage (évite un décalage d'hydratation). */
export function syncRadiusFromStorage() {
  const km = initialRadius()
  if (km !== useLocationFilter.getState().radiusKm) useLocationFilter.setState({ radiusKm: km })
}
