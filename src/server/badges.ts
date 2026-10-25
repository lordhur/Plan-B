import { BADGES } from '@/lib/constants'
import { prisma } from './db'
import { notify } from './notifications'

/**
 * Moteur de badges automatiques — évalue les critères de la spec
 * (lib/constants.ts::BADGES) et attribue les badges manquants.
 *
 * Critères supportés :
 * - emailVerified / phoneVerified : booléens
 * - trustScore / eventsAttended / eventsCreated / friendCount : seuils min
 * - averageRating + totalRatings : note et volume minimum
 * - categoryAttended + count : événements ATTENDED dans une catégorie
 * - registeredBefore : date ISO
 * - photosUploaded : photos partagées (albums — Phase 3, jamais atteint avant)
 */

type Criteria = Record<string, unknown>

interface UserBadgeContext {
  emailVerified: boolean
  phoneVerified: boolean
  trustScore: number
  eventsAttended: number
  eventsCreated: number
  friendCount: number
  averageRating: number
  totalRatings: number
  createdAt: Date
  categoryCounts: Map<string, number>
  photosUploaded: number
}

async function loadContext(userId: string): Promise<UserBadgeContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      emailVerified: true,
      phoneVerified: true,
      trustScore: true,
      eventsAttended: true,
      eventsCreated: true,
      friendCount: true,
      averageRating: true,
      totalRatings: true,
      createdAt: true,
    },
  })
  if (!user) return null

  const [attended, photos] = await Promise.all([
    prisma.eventParticipation.findMany({
      where: { userId, status: 'ATTENDED' },
      select: { event: { select: { category: { select: { slug: true } } } } },
    }),
    prisma.media.count({
      where: {
        OR: [
          { uploaderId: userId },
          { identifications: { some: { userId, confirmed: true } } },
        ],
      },
    }),
  ])

  const categoryCounts = new Map<string, number>()
  for (const p of attended) {
    const slug = p.event.category.slug
    categoryCounts.set(slug, (categoryCounts.get(slug) ?? 0) + 1)
  }

  return { ...user, categoryCounts, photosUploaded: photos }
}

function meetsCriteria(ctx: UserBadgeContext, criteria: Criteria): boolean {
  if (criteria.emailVerified === true && !ctx.emailVerified) return false
  if (criteria.phoneVerified === true && !ctx.phoneVerified) return false
  if (typeof criteria.trustScore === 'number' && ctx.trustScore < criteria.trustScore) return false
  if (typeof criteria.eventsAttended === 'number' && ctx.eventsAttended < criteria.eventsAttended) return false
  if (typeof criteria.eventsCreated === 'number' && ctx.eventsCreated < criteria.eventsCreated) return false
  if (typeof criteria.friendCount === 'number' && ctx.friendCount < criteria.friendCount) return false
  if (typeof criteria.photosUploaded === 'number' && ctx.photosUploaded < criteria.photosUploaded) return false
  if (typeof criteria.averageRating === 'number') {
    if (ctx.totalRatings < ((criteria.totalRatings as number) ?? 1)) return false
    if (ctx.averageRating < criteria.averageRating) return false
  }
  if (typeof criteria.categoryAttended === 'string') {
    const required = (criteria.count as number) ?? 1
    if ((ctx.categoryCounts.get(criteria.categoryAttended) ?? 0) < required) return false
  }
  if (typeof criteria.registeredBefore === 'string') {
    if (ctx.createdAt >= new Date(criteria.registeredBefore)) return false
  }
  return true
}

/** Évalue et attribue les badges manquants d'un utilisateur. Retourne les codes gagnés. */
export async function awardBadges(userId: string): Promise<string[]> {
  const ctx = await loadContext(userId)
  if (!ctx) return []

  const owned = await prisma.userBadge.findMany({
    where: { userId },
    include: { badge: { select: { code: true } } },
  })
  const ownedCodes = new Set(owned.map((ub) => ub.badge.code))

  const earned: string[] = []
  for (const def of BADGES) {
    if (ownedCodes.has(def.code)) continue
    if (!meetsCriteria(ctx, def.criteria as unknown as Criteria)) continue

    const badge = await prisma.badge.findUnique({ where: { code: def.code } })
    if (!badge) continue // base non seedée

    await prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      update: {},
      create: { userId, badgeId: badge.id },
    })
    await notify(userId, 'BADGE_EARNED', `Badge débloqué : ${def.name} ${def.icon}`, def.description, {
      link: '/profile',
      data: { badgeCode: def.code },
    })
    earned.push(def.code)
  }
  return earned
}

/** Évalue tous les comptes actifs (cron quotidien). */
export async function awardAllBadges(): Promise<{ users: number; badges: number }> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
    take: 5000,
  })
  let badges = 0
  for (const u of users) {
    const earned = await awardBadges(u.id)
    badges += earned.length
  }
  return { users: users.length, badges }
}
