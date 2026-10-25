import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Fusionne les classes Tailwind de façon intelligente (shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formate un prix en EUR. */
export function formatPrice(price: number | null | undefined, isFree: boolean): string {
  if (isFree || price == null || price === 0) return 'Gratuit'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price)
}

/** Slugify un titre (accents → ASCII, minuscules, tirets). */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60)
}

/** Calcule l'âge à partir d'une date de naissance. */
export function ageFromBirthDate(dateOfBirth: Date): number {
  const now = new Date()
  let age = now.getFullYear() - dateOfBirth.getFullYear()
  const m = now.getMonth() - dateOfBirth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dateOfBirth.getDate())) age--
  return age
}

/** Distance "à vol d'oiseau" entre deux coordonnées GPS (formule de haversine), en km. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Formate une distance de façon lisible. */
export function formatDistance(km: number | null | undefined): string {
  if (km == null) return ''
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}
