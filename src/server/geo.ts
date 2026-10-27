/**
 * Helpers géographiques partagés par les routeurs (membres, groupes, pages, événements).
 * Le rayon vient TOUJOURS de la jauge de kilomètres (store `useLocationFilter`).
 */

export interface GeoBox {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

/** Distance orthodromique en km entre deux points. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Cadre englobant un disque de `radiusKm` autour d'un point (pré-filtre SQL). */
export function bboxAround(lat: number, lon: number, radiusKm: number): GeoBox {
  const latDelta = radiusKm / 111.32 + 0.02
  const cos = Math.max(0.2, Math.cos((lat * Math.PI) / 180))
  const lonDelta = radiusKm / (111.32 * cos) + 0.02
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  }
}

/**
 * Normalise les entrées géographiques d'un endpoint : centre (ville/GPS) + rayon,
 * ou cadre (région/département).
 */
export interface GeoInput {
  lat?: number
  lon?: number
  radiusKm?: number
  minLat?: number
  maxLat?: number
  minLon?: number
  maxLon?: number
}

export interface ResolvedGeo {
  /** Centre quand la recherche se fait par rayon. */
  center: { lat: number; lon: number; radiusKm: number } | null
  /** Cadre quand la recherche se fait par zone administrative. */
  box: GeoBox | null
}

export function resolveGeo(input: GeoInput): ResolvedGeo {
  const hasBox =
    input.minLat != null && input.maxLat != null && input.minLon != null && input.maxLon != null
  const hasCenter = input.lat != null && input.lon != null
  if (hasCenter) {
    const radiusKm = Math.min(300, Math.max(1, Math.round(input.radiusKm ?? 25)))
    return { center: { lat: input.lat!, lon: input.lon!, radiusKm }, box: null }
  }
  if (hasBox) {
    return {
      center: null,
      box: {
        minLat: input.minLat!,
        maxLat: input.maxLat!,
        minLon: input.minLon!,
        maxLon: input.maxLon!,
      },
    }
  }
  return { center: null, box: null }
}

/** Clause Prisma de pré-filtrage (cadre explicite ou disque converti en cadre). */
export function geoWhere(geo: ResolvedGeo): Record<string, unknown> {
  const box = geo.box ?? (geo.center ? bboxAround(geo.center.lat, geo.center.lon, geo.center.radiusKm) : null)
  if (!box) return {}
  return {
    latitude: { gte: box.minLat, lte: box.maxLat },
    longitude: { gte: box.minLon, lte: box.maxLon },
  }
}

/** Distance exacte au centre, ou null si le point est inconnu. */
export function distanceTo(
  geo: ResolvedGeo,
  lat: number | null | undefined,
  lon: number | null | undefined,
): number | null {
  if (!geo.center || lat == null || lon == null) return null
  return Math.round(haversineKm(geo.center.lat, geo.center.lon, lat, lon) * 10) / 10
}

/** Vrai si le point respecte le rayon (ou le cadre) demandé. */
export function withinGeo(
  geo: ResolvedGeo,
  lat: number | null | undefined,
  lon: number | null | undefined,
): boolean {
  if (!geo.center && !geo.box) return true
  if (lat == null || lon == null) return false
  if (geo.center) {
    return haversineKm(geo.center.lat, geo.center.lon, lat, lon) <= geo.center.radiusKm
  }
  const b = geo.box!
  return lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon
}
