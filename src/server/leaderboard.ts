import { prisma } from './db'

/**
 * Classements (spec Phase 3 §3.4).
 * Score = événements participés × 10 + événements organisés × 15,
 * calculé sur la période (semaine / mois / tout le temps), scope national.
 * Alimenté par le cron `update-leaderboards`.
 */

const PERIODS = ['WEEKLY', 'MONTHLY', 'ALL_TIME'] as const
export type LeaderboardPeriod = (typeof PERIODS)[number]

function periodStart(period: LeaderboardPeriod): Date | undefined {
  const now = new Date()
  if (period === 'WEEKLY') return new Date(now.getTime() - 7 * 24 * 3600 * 1000)
  if (period === 'MONTHLY') return new Date(now.getFullYear(), now.getMonth(), 1)
  return undefined
}

/** Recalcule tous les classements (national, 3 périodes). */
export async function refreshLeaderboards(): Promise<{ entries: number }> {
  let entries = 0

  for (const period of PERIODS) {
    const since = periodStart(period)

    const [attended, created] = await Promise.all([
      prisma.eventParticipation.groupBy({
        by: ['userId'],
        where: {
          status: 'ATTENDED',
          ...(since ? { joinedAt: { gte: since } } : {}),
        },
        _count: { _all: true },
      }),
      prisma.event.groupBy({
        by: ['organizerId'],
        where: {
          status: 'COMPLETED',
          ...(since ? { createdAt: { gte: since } } : {}),
        },
        _count: { _all: true },
      }),
    ])

    const scores = new Map<string, number>()
    for (const a of attended) scores.set(a.userId, (scores.get(a.userId) ?? 0) + a._count._all * 10)
    for (const c of created) scores.set(c.organizerId, (scores.get(c.organizerId) ?? 0) + c._count._all * 15)

    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1])

    // Repart de zéro pour la période, puis réinsère
    await prisma.leaderboardEntry.deleteMany({
      where: { period, scope: 'NATIONAL' },
    })
    if (ranked.length > 0) {
      await prisma.leaderboardEntry.createMany({
        data: ranked.map(([userId, score], i) => ({
          userId,
          period,
          scope: 'NATIONAL' as const,
          score,
          rank: i + 1,
        })),
      })
      entries += ranked.length
    }
  }

  return { entries }
}
