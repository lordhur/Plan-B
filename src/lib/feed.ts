import { haversineKm } from './utils'

/**
 * Algorithme de tri du fil d'actualité PlanB.
 *
 * Score = (proximity * 0.3) + (friend * 0.3) + (interest * 0.2) +
 *         (recency * 0.1) + (popularity * 0.1)
 *
 * Chaque sous-score est normalisé entre 0 et 100.
 * Phase 1 : friend_score vaut 0 (le système d'amis arrive en Phase 2),
 * les poids sont alors renormalisés sur les signaux disponibles.
 */

export interface FeedEventLike {
  id: string
  latitude: number
  longitude: number
  startDate: Date
  createdAt: Date
  currentParticipants: number
  maxParticipants: number | null
  categoryId: string
  isSponsored: boolean
  tags: string[]
}

export interface FeedUserContext {
  latitude?: number | null
  longitude?: number | null
  interests?: string[] // noms d'intérêts + slugs de catégories favoris
  friendIds?: string[] // Phase 2
  favoriteCategoryIds?: string[]
}

export interface ScoredEvent<E> {
  event: E
  score: number
  distanceKm: number | null
}

/** Score de proximité : 100 à 0 km, 0 au-delà de 50 km (décroissance linéaire). */
export function proximityScore(distanceKm: number | null): number {
  if (distanceKm == null) return 40 // pas de géoloc utilisateur → score neutre
  return Math.max(0, 100 - (distanceKm / 50) * 100)
}

/** Score d'intérêt : catégorie favorite ou tags qui matchent les intérêts. */
export function interestScore(event: FeedEventLike, user: FeedUserContext): number {
  let score = 0
  if (user.favoriteCategoryIds?.includes(event.categoryId)) score += 50
  const interests = (user.interests ?? []).map((i) => i.toLowerCase())
  for (const tag of event.tags) {
    if (interests.some((i) => i.includes(tag.toLowerCase()) || tag.toLowerCase().includes(i))) {
      score += 25
    }
  }
  return Math.min(100, score)
}

/** Score de récence : 100 si créé il y a moins de 24 h, 0 après 14 jours. */
export function recencyScore(createdAt: Date, now: Date = new Date()): number {
  const hours = (now.getTime() - createdAt.getTime()) / 3600000
  if (hours <= 24) return 100
  if (hours >= 24 * 14) return 0
  return 100 - ((hours - 24) / (24 * 13)) * 100
}

/** Score de popularité : ratio de remplissage, bonus pour les événements qui se remplissent. */
export function popularityScore(current: number, max: number | null): number {
  if (max == null) return Math.min(100, current * 10) // illimité → basé sur l'absolu
  const ratio = current / max
  return Math.min(100, ratio * 100 + (current > 0 ? 10 : 0))
}

/** Score global (0-100). */
export function computeFeedScore(event: FeedEventLike, user: FeedUserContext, now: Date = new Date()): number {
  const distanceKm =
    user.latitude != null && user.longitude != null
      ? haversineKm(user.latitude, user.longitude, event.latitude, event.longitude)
      : null

  const proximity = proximityScore(distanceKm)
  const friend = 0 // Phase 2 — système d'amis
  const interest = interestScore(event, user)
  const recency = recencyScore(event.createdAt, now)
  const popularity = popularityScore(event.currentParticipants, event.maxParticipants)

  // friend_score indisponible en Phase 1 → on renormalise les autres poids (0.7 → 1.0)
  const k = 1 / 0.7
  return (
    (proximity * 0.3 + interest * 0.2 + recency * 0.1 + popularity * 0.1) * k
  )
}

/** Trie et annote les événements pour le fil. */
export function rankEvents<E extends FeedEventLike>(
  events: E[],
  user: FeedUserContext,
  now: Date = new Date(),
): ScoredEvent<E>[] {
  return events
    .map((event) => ({
      event,
      score: computeFeedScore(event, user, now),
      distanceKm:
        user.latitude != null && user.longitude != null
          ? haversineKm(user.latitude, user.longitude, event.latitude, event.longitude)
          : null,
    }))
    .sort((a, b) => b.score - a.score)
}
