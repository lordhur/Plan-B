import { z } from 'zod'
import { prisma } from '../db'
import { createTRPCRouter, protectedProcedure } from '../trpc'

export const notificationsRouter = createTRPCRouter({
  /** Centre de notifications. */
  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20), unreadOnly: z.boolean().default(false) }))
    .query(async ({ input, ctx }) => {
      return prisma.notification.findMany({
        where: {
          userId: ctx.user.id,
          ...(input.unreadOnly ? { isRead: false } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      })
    }),

  /** Compteur pour la cloche. */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await prisma.notification.count({
      where: { userId: ctx.user.id, isRead: false },
    })
    return { count }
  }),

  /** Marque une notification comme lue. */
  markRead: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    await prisma.notification.updateMany({
      where: { id: input.id, userId: ctx.user.id },
      data: { isRead: true },
    })
    return { ok: true }
  }),

  /** Tout marquer comme lu. */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await prisma.notification.updateMany({
      where: { userId: ctx.user.id, isRead: false },
      data: { isRead: true },
    })
    return { ok: true }
  }),
})
