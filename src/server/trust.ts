import { prisma } from './db'

/**
 * Score de confiance (0-100) — spec PlanB :
 *
 * trust = 30 (base)
 *       + note moyenne pondérée (notes récentes comptent plus)      → 0-30
 *       + événements participés (plus = meilleur)                   → 0-20
 *       + ancienneté du compte                                      → 0-10
 *       - ratio no-show                                             → 0-20
 *       - signalements                                              → 0-30
 *
 * < 20 : restrictions automatiques (création/inscription limitées)
 * < 10 : suspension temporaire + review admin (voir verifiedProcedure)
 */

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export async function computeTrustScore(userId: string): Promise<number> {
  const [user, ratings, participationStats, reports] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true, totalRatings: true } }),
    prisma.userRating.findMany({
      where: { toId: userId },
      select: { rating: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.eventParticipation.groupBy({
      by: ['status'],
      where: { userId, status: { in: ['ATTENDED', 'NO_SHOW'] } },
      _count: { _all: true },
    }),
    prisma.report.count({
      where: { reportedId: userId, status: { in: ['PENDING', 'INVESTIGATING', 'RESOLVED'] } },
    }),
  ])
  if (!user) return 50

  // 1. Note moyenne pondérée — demi-vie d'un an (les notes récentes comptent double)
  let ratingScore = 20 // neutre si aucune note
  if (ratings.length > 0) {
    const now = Date.now()
    let weightedSum = 0
    let weightTotal = 0
    for (const r of ratings) {
      const ageDays = (now - r.createdAt.getTime()) / 86400000
      const w = Math.exp(-ageDays / 365) // demi-vie ~1 an
      weightedSum += r.rating * w
      weightTotal += w
    }
    const avg = weightedSum / Math.max(weightTotal, 1e-9)
    ratingScore = ((avg - 1) / 4) * 30 // 1★→0, 5★→30
  }

  // 2. Participation
  const attended = participationStats.find((s) => s.status === 'ATTENDED')?._count._all ?? 0
  const noShows = participationStats.find((s) => s.status === 'NO_SHOW')?._count._all ?? 0
  const attendanceScore = Math.min(20, attended * 2)

  // 3. Ancienneté (2 points/an, plafond 10)
  const years = (Date.now() - user.createdAt.getTime()) / (365.25 * 86400000)
  const seniority = Math.min(10, years * 2)

  // 4. No-shows (ratio sur événements terminés)
  const finished = attended + noShows
  const noShowRatio = finished > 0 ? noShows / finished : 0
  const noShowPenalty = noShowRatio * 20

  // 5. Signalements (5 points chacun, confirmé ou en cours)
  const reportPenalty = Math.min(30, reports * 5)

  return Math.round(clamp(30 + ratingScore + attendanceScore + seniority - noShowPenalty - reportPenalty, 0, 100))
}

/** Recalcule le trust score d'un utilisateur et le persiste. */
export async function refreshTrustScore(userId: string): Promise<number> {
  const score = await computeTrustScore(userId)
  await prisma.user.update({ where: { id: userId }, data: { trustScore: score } })
  return score
}

/** Recalcule tous les comptes actifs (cron quotidien). */
export async function refreshAllTrustScores(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
    take: 5000,
  })
  for (const u of users) await refreshTrustScore(u.id)
  return users.length
}
