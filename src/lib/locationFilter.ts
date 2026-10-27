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
const FILTER_KEY = 'planb_geofilter'

export function readStoredRadius(): number {
  if (typeof window === 'undefined') return DEFAULT_RADIUS_KM
  const saved = Number(window.localStorage.getItem(STORAGE_KEY))
  return Number.isFinite(saved) && saved >= MIN_RADIUS_KM && saved <= MAX_RADIUS_KM
    ? saved
    : DEFAULT_RADIUS_KM
}

function readStoredFilter(): LocationFilter {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(FILTER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LocationFilter
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.type === 'city' && typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
      return parsed
    }
    if ((parsed.type === 'region' || parsed.type === 'dept') && parsed.bbox) return parsed
    return null
  } catch {
    return null
  }
}

function persistFilter(filter: LocationFilter) {
  if (typeof window === 'undefined') return
  try {
    if (filter) window.localStorage.setItem(FILTER_KEY, JSON.stringify(filter))
    else window.localStorage.removeItem(FILTER_KEY)
  } catch {
    /* stockage indisponible */
  }
}

/**
 * Filtre géographique PARTAGÉ par tout le site : carte, fil d'actualité, membres,
 * groupes et pages. La jauge de kilomètres est la même partout (spec).
 */
export const useLocationFilter = create<LocationStore>((set) => ({
  filter: null,
  radiusKm: DEFAULT_RADIUS_KM,
  setFilter: (filter) => {
    persistFilter(filter)
    set({ filter })
  },
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
  clear: () => {
    persistFilter(null)
    set({ filter: null })
  },
}))

/** Relit la zone et le rayon mémorisés (à appeler une fois au montage). */
export function syncGeoFromStorage() {
  const radiusKm = readStoredRadius()
  const filter = readStoredFilter()
  const state = useLocationFilter.getState()
  if (radiusKm !== state.radiusKm || filter !== state.filter) {
    useLocationFilter.setState({ radiusKm, filter })
  }
}

/** Compatibilité avec les anciens appels. */
export const syncRadiusFromStorage = syncGeoFromStorage

/**
 * Paramètres géographiques à envoyer au serveur, dérivés du store :
 * centre (ville / GPS) + rayon, ou cadre (région / département).
 */
export interface GeoQuery {
  /** Nom de la zone active (« Marseille », « Var », « Ma position »…). */
  name: string | null
  /** Type de zone active. */
  kind: 'city' | 'region' | 'dept' | 'gps' | null
  lat: number | null
  lon: number | null
  radiusKm: number
  bbox: BBox | null
}

export function geoQueryFrom(filter: LocationFilter, radiusKm: number): GeoQuery {
  if (!filter) {
    return { name: null, kind: null, lat: null, lon: null, radiusKm, bbox: null }
  }
  if (filter.type === 'city') {
    return {
      name: filter.name,
      kind: filter.name === 'Ma position' ? 'gps' : 'city',
      lat: filter.lat,
      lon: filter.lon,
      radiusKm,
      bbox: null,
    }
  }
  return {
    name: filter.name,
    kind: filter.type,
    lat: null,
    lon: null,
    radiusKm,
    bbox: filter.bbox,
  }
}

/** Cadre géographique autour d'un point pour un rayon donné (pré-filtrage SQL). */
export function bboxAround(lat: number, lon: number, radiusKm: number): BBox {
  const latDelta = radiusKm / 111.32
  const cos = Math.max(0.2, Math.cos((lat * Math.PI) / 180))
  const lonDelta = radiusKm / (111.32 * cos)
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  }
}
