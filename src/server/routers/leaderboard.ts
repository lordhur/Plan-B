import { z } from 'zod'
import { prisma } from '../db'
import { createTRPCRouter, publicProcedure } from '../trpc'

const RANKING_USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  displayName: true,
  avatarUrl: true,
  city: true,
  averageRating: true,
  totalRatings: true,
} as const

type RankRow = {
  userId: string
  count: number
  user: {
    id: string
    firstName: string
    lastName: string
    displayName: string | null
    avatarUrl: string | null
    city: string | null
    averageRating: number
    totalRatings: number
  }
}

/** Classements publics (spec Phase 3 §3.4). */
export const leaderboardRouter = createTRPCRouter({
  top: publicProcedure
    .input(
      z.object({
        period: z.enum(['WEEKLY', 'MONTHLY', 'ALL_TIME']).default('MONTHLY'),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ input }) => {
      return prisma.leaderboardEntry.findMany({
        where: { period: input.period, scope: 'NATIONAL' },
        orderBy: { score: 'desc' },
        take: input.limit,
        include: {
          user: { select: RANKING_USER_SELECT },
        },
      })
    }),

  /**
   * Classements multiples calculés en direct :
   * - participants les plus actifs (mois / général)
   * - plus grands organisateurs (mois / général)
   * - meilleurs par catégorie d'événement (mois / général)
   */
  rankings: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(10) }).nullish())
    .query(async ({ input }) => {
      const take = input?.limit ?? 10
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      /** Extrait le total _count quel que soit le typage Prisma du groupBy. */
      const allCount = (c: unknown): number =>
        c && typeof c === 'object' && '_all' in c
          ? Number((c as { _all?: number })._all ?? 0)
          : 0

      const withUsers = async (rows: { userId: string; _count: unknown }[]): Promise<RankRow[]> => {
        const ids = rows.map((r) => r.userId)
        const users = await prisma.user.findMany({
          where: { id: { in: ids } },
          select: RANKING_USER_SELECT,
        })
        const byId = new Map(users.map((u) => [u.id, u]))
        return rows
          .map((r) => ({ userId: r.userId, count: allCount(r._count), user: byId.get(r.userId) }))
          .filter((r): r is RankRow => !!r.user)
      }

      // Participants confirmés
      const partWhere = (since?: Date) => ({
        status: 'CONFIRMED' as const,
        ...(since ? { joinedAt: { gte: since } } : {}),
      })

      const [actMonth, actAll, orgMonth, orgAll] = await Promise.all([
        prisma.eventParticipation.groupBy({
          by: ['userId'],
          where: partWhere(monthStart),
          _count: { _all: true },
          orderBy: { _count: { userId: 'desc' } },
          take,
        }),
        prisma.eventParticipation.groupBy({
          by: ['userId'],
          where: partWhere(),
          _count: { _all: true },
          orderBy: { _count: { userId: 'desc' } },
          take,
        }),
        prisma.event.groupBy({
          by: ['organizerId'],
          where: {
            status: { in: ['UPCOMING', 'ONGOING', 'COMPLETED'] },
            createdAt: { gte: monthStart },
          },
          _count: { _all: true },
          orderBy: { _count: { organizerId: 'desc' } },
          take,
        }),
        prisma.event.groupBy({
          by: ['organizerId'],
          where: { status: { in: ['UPCOMING', 'ONGOING', 'COMPLETED'] } },
          _count: { _all: true },
          orderBy: { _count: { organizerId: 'desc' } },
          take,
        }),
      ])

      // Par catégorie : champions du mois (top 3 par catégorie)
      const categories = await prisma.eventCategory.findMany({
        select: { id: true, slug: true, name: true, icon: true, color: true },
        orderBy: { name: 'asc' },
      })
      const byCategory = await Promise.all(
        categories.map(async (cat) => {
          const rows = await prisma.eventParticipation.groupBy({
            by: ['userId'],
            where: { ...partWhere(monthStart), event: { categoryId: cat.id } },
            _count: { _all: true },
            orderBy: { _count: { userId: 'desc' } },
            take: 3,
          })
          return {
            slug: cat.slug,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            top: await withUsers(rows),
          }
        }),
      )

      return {
        activesMonth: await withUsers(actMonth),
        activesAll: await withUsers(actAll),
        organizersMonth: await withUsers(
          orgMonth.map((r) => ({ userId: r.organizerId, _count: r._count })),
        ),
        organizersAll: await withUsers(
          orgAll.map((r) => ({ userId: r.organizerId, _count: r._count })),
        ),
        byCategory: byCategory.filter((c) => c.top.length > 0),
      }
    }),
})

