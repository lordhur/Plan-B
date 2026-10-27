import { prisma } from '../db'
import { createTRPCRouter, protectedProcedure } from '../trpc'

const EVENT_SELECT = {
  id: true,
  slug: true,
  title: true,
  startDate: true,
  endDate: true,
  city: true,
  coverImage: true,
  category: { select: { slug: true, name: true, icon: true, color: true } },
  organizer: { select: { id: true, firstName: true, lastName: true, displayName: true } },
  currentParticipants: true,
  maxParticipants: true,
} as const

/** « Mon agenda » — inscrits, liste d'attente, likés, passés. */
export const agendaRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const [participations, waitlist, likes] = await Promise.all([
      prisma.eventParticipation.findMany({
        where: { userId: ctx.user.id, status: { in: ['CONFIRMED', 'PENDING', 'ATTENDED'] } },
        include: { event: { select: EVENT_SELECT } },
        orderBy: { joinedAt: 'desc' },
        take: 80,
      }),
      prisma.waitlistEntry.findMany({
        where: { userId: ctx.user.id },
        include: { event: { select: EVENT_SELECT } },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
      prisma.eventLike.findMany({
        where: { userId: ctx.user.id },
        include: { event: { select: EVENT_SELECT } },
        orderBy: { createdAt: 'desc' },
        take: 40,
      }),
    ])

    const upcoming = participations
      .filter((p) => p.event.startDate >= now && p.event.startDate.getFullYear() > 2000)
      .map((p) => ({ ...p.event, myStatus: p.status }))
    const past = participations
      .filter((p) => p.event.startDate < now)
      .map((p) => ({ ...p.event, myStatus: p.status }))

    return {
      upcoming,
      waitlist: waitlist.map((w) => ({ ...w.event, position: w.position })),
      liked: likes.map((l) => ({ ...l.event, liked: true })).filter((e) => e.startDate >= now),
      past,
    }
  }),
})
