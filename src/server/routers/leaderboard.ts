import { z } from 'zod'
import { prisma } from '../db'
import { createTRPCRouter, publicProcedure } from '../trpc'

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
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              city: true,
              averageRating: true,
              totalRatings: true,
            },
          },
        },
      })
    }),
})
