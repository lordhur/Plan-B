import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { prisma } from '../db'
import { notify } from '../notifications'
import { createTRPCRouter, protectedProcedure } from '../trpc'

/**
 * Notation post-événement (spec Phase 2) :
 * après un événement COMPLETED, les participants ATTENDED notent
 * les autres participants (1-5 étoiles + commentaire optionnel).
 */

const raterSelect = {
  id: true,
  firstName: true,
  lastName: true,
  displayName: true,
  avatarUrl: true,
} as const

export const ratingsRouter = createTRPCRouter({
  /** Participants que je peux noter (ou que j'ai déjà notés) pour un événement. */
  pending: protectedProcedure.input(z.object({ eventId: z.string() })).query(async ({ input, ctx }) => {
    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
      select: { id: true, slug: true, title: true, status: true, organizerId: true },
    })
    if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'Événement introuvable' })

    const me = await prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: ctx.user.id } },
      select: { status: true },
    })
    const isAllowed = me?.status === 'ATTENDED' || event.organizerId === ctx.user.id
    if (!isAllowed) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux participants de l’événement' })
    }
    if (event.status !== 'COMPLETED') {
      return { canRate: false as const, event, participants: [], given: [] }
    }

    const [attendees, given] = await Promise.all([
      prisma.eventParticipation.findMany({
        where: { eventId: event.id, status: 'ATTENDED', userId: { not: ctx.user.id } },
        select: { user: { select: raterSelect } },
      }),
      prisma.userRating.findMany({
        where: { fromId: ctx.user.id, eventId: event.id },
        select: { toId: true, rating: true, comment: true },
      }),
    ])

    return {
      canRate: true as const,
      event,
      participants: attendees.map((a) => a.user),
      given,
    }
  }),

  /** Noter un participant. */
  rate: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        toUserId: z.string(),
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().max(500).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.toUserId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Vous ne pouvez pas vous noter vous-même' })
      }

      const [event, me, target] = await Promise.all([
        prisma.event.findUnique({ where: { id: input.eventId }, select: { status: true, organizerId: true, slug: true } }),
        prisma.eventParticipation.findUnique({
          where: { eventId_userId: { eventId: input.eventId, userId: ctx.user.id } },
          select: { id: true, status: true },
        }),
        prisma.eventParticipation.findUnique({
          where: { eventId_userId: { eventId: input.eventId, userId: input.toUserId } },
          select: { status: true, user: { select: { firstName: true } } },
        }),
      ])

      if (!event || event.status !== 'COMPLETED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Les notes ouvrent après l’événement' })
      }
      const meAllowed = me?.status === 'ATTENDED' || event.organizerId === ctx.user.id
      if (!meAllowed) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux participants' })
      }
      if (!target || target.status !== 'ATTENDED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ce participant ne peut pas être noté' })
      }

      const exists = await prisma.userRating.findUnique({
        where: { fromId_toId_eventId: { fromId: ctx.user.id, toId: input.toUserId, eventId: input.eventId } },
      })
      if (exists) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Vous avez déjà noté ce participant' })
      }

      await prisma.userRating.create({
        data: {
          fromId: ctx.user.id,
          toId: input.toUserId,
          eventId: input.eventId,
          rating: input.rating,
          comment: input.comment,
        },
      })

      // Recalcule la moyenne du noté
      const agg = await prisma.userRating.aggregate({
        where: { toId: input.toUserId },
        _avg: { rating: true },
        _count: { _all: true },
      })
      await prisma.user.update({
        where: { id: input.toUserId },
        data: {
          averageRating: Math.round((agg._avg.rating ?? 5) * 100) / 100,
          totalRatings: agg._count._all,
        },
      })

      if (me) {
        await prisma.eventParticipation.update({ where: { id: me.id }, data: { hasRated: true } })
      }

      await notify(
        input.toUserId,
        'RATING_RECEIVED',
        `Nouvel avis : ${'★'.repeat(input.rating)} ${input.rating}/5`,
        `${ctx.user.firstName} vous a noté·e après votre dernier plan${input.comment ? ` — « ${input.comment.slice(0, 100)} »` : ''}`,
        { link: '/profile', data: { eventId: input.eventId } },
      )

      return { ok: true }
    }),

  /** Signaler un comportement (post-événement ou profil). */
  report: protectedProcedure
    .input(
      z.object({
        reportedId: z.string(),
        eventId: z.string().optional(),
        reason: z.enum([
          'HARASSMENT',
          'INAPPROPRIATE_BEHAVIOR',
          'NO_SHOW',
          'FAKE_PROFILE',
          'SPAM',
          'VIOLENCE',
          'OTHER',
        ]),
        description: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.reportedId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Signalement de vous-même impossible' })
      }
      await prisma.report.create({
        data: {
          reporterId: ctx.user.id,
          reportedId: input.reportedId,
          eventId: input.eventId,
          reason: input.reason,
          description: input.description,
        },
      })
      return { ok: true }
    }),
})
