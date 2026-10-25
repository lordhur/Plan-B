import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { prisma } from '../db'
import { notify } from '../notifications'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc'

/** Covoiturage pour les événements (spec Phase 3 §3.3). */

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  averageRating: true,
} as const

/** Réservé aux participants confirmés de l'événement (ou organisateur). */
async function assertParticipant(userId: string, eventId: string) {
  const [event, participation] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { id: true, slug: true, title: true, organizerId: true, startDate: true } }),
    prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { status: true },
    }),
  ])
  if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'Événement introuvable' })
  const ok =
    event.organizerId === userId ||
    (participation && ['CONFIRMED', 'ATTENDED'].includes(participation.status))
  if (!ok) throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux participants de l’événement' })
  return event
}

export const carpoolRouter = createTRPCRouter({
  /** Offres de covoiturage d'un événement (avec ma demande éventuelle). */
  offers: publicProcedure.input(z.object({ eventId: z.string() })).query(async ({ input, ctx }) => {
    const offers = await prisma.carpoolOffer.findMany({
      where: { eventId: input.eventId },
      include: {
        driver: { select: userSelect },
        requests: {
          where: { status: { in: ['PENDING', 'ACCEPTED'] } },
          include: { passenger: { select: userSelect } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    return offers.map((o) => ({
      ...o,
      myRequest: ctx.user ? o.requests.find((r) => r.passengerId === ctx.user!.id) ?? null : null,
      acceptedSeats: o.requests.filter((r) => r.status === 'ACCEPTED').reduce((n, r) => n + r.seatsRequested, 0),
    }))
  }),

  /** Proposer un trajet (conducteur = participant). */
  createOffer: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        departurePoint: z.string().trim().min(3).max(120),
        departureLatitude: z.number().min(-90).max(90),
        departureLongitude: z.number().min(-180).max(180),
        departureTime: z.coerce.date(),
        availableSeats: z.number().int().min(1).max(8),
        pricePerSeat: z.number().min(0).max(100).default(0),
        notes: z.string().trim().max(300).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const event = await assertParticipant(ctx.user.id, input.eventId)
      if (input.departureTime.getTime() > event.startDate.getTime()) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Le départ doit précéder le début de l’événement' })
      }
      const existing = await prisma.carpoolOffer.findFirst({
        where: { eventId: input.eventId, driverId: ctx.user.id },
      })
      if (existing) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Vous proposez déjà un trajet' })

      const offer = await prisma.carpoolOffer.create({
        data: {
          eventId: input.eventId,
          driverId: ctx.user.id,
          departurePoint: input.departurePoint,
          departureLatitude: input.departureLatitude,
          departureLongitude: input.departureLongitude,
          departureTime: input.departureTime,
          availableSeats: input.availableSeats,
          pricePerSeat: input.pricePerSeat,
          notes: input.notes,
        },
        include: { driver: { select: userSelect } },
      })

      // Les participants confirmés sont informés de la nouvelle offre
      const participants = await prisma.eventParticipation.findMany({
        where: { eventId: input.eventId, status: 'CONFIRMED', userId: { not: ctx.user.id } },
        select: { userId: true },
      })
      for (const p of participants) {
        await notify(p.userId, 'SYSTEM', 'Covoiturage proposé 🚗', `${ctx.user.firstName} propose un trajet pour « ${event.title} »`, {
          link: `/events/${event.slug}`,
          data: { offerId: offer.id },
        })
      }
      return offer
    }),

  /** Demander une place. */
  request: protectedProcedure
    .input(z.object({ offerId: z.string(), seatsRequested: z.number().int().min(1).max(4).default(1) }))
    .mutation(async ({ input, ctx }) => {
      const offer = await prisma.carpoolOffer.findUnique({
        where: { id: input.offerId },
        include: {
          event: { select: { slug: true, title: true } },
          requests: { where: { status: 'ACCEPTED' }, select: { seatsRequested: true } },
        },
      })
      if (!offer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trajet introuvable' })
      if (offer.driverId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'C’est votre propre trajet' })
      }
      await assertParticipant(ctx.user.id, offer.eventId)

      const taken = offer.requests.reduce((n, r) => n + r.seatsRequested, 0)
      if (taken + input.seatsRequested > offer.availableSeats) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Plus assez de places sur ce trajet' })
      }

      const existing = await prisma.carpoolRequest.findUnique({
        where: { offerId_passengerId: { offerId: offer.id, passengerId: ctx.user.id } },
      })
      if (existing && existing.status !== 'CANCELLED' && existing.status !== 'DECLINED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Demande déjà en cours' })
      }

      const request = existing
        ? await prisma.carpoolRequest.update({
            where: { id: existing.id },
            data: { status: 'PENDING', seatsRequested: input.seatsRequested },
          })
        : await prisma.carpoolRequest.create({
            data: { offerId: offer.id, passengerId: ctx.user.id, seatsRequested: input.seatsRequested },
          })

      await notify(offer.driverId, 'CARPOOL_REQUEST', 'Demande de covoiturage 🚗', `${ctx.user.firstName} demande ${input.seatsRequested} place(s) pour « ${offer.event.title} »`, {
        link: `/events/${offer.event.slug}`,
        data: { offerId: offer.id, requestId: request.id },
      })
      return request
    }),

  /** Conducteur : accepter ou refuser une demande. */
  respond: protectedProcedure
    .input(z.object({ requestId: z.string(), accept: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const request = await prisma.carpoolRequest.findUnique({
        where: { id: input.requestId },
        include: { offer: { include: { event: { select: { slug: true, title: true } } } } },
      })
      if (!request || request.offer.driverId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Demande introuvable' })
      }
      if (request.status !== 'PENDING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Demande déjà traitée' })
      }

      if (input.accept) {
        const taken = await prisma.carpoolRequest.aggregate({
          where: { offerId: request.offerId, status: 'ACCEPTED' },
          _sum: { seatsRequested: true },
        })
        if ((taken._sum.seatsRequested ?? 0) + request.seatsRequested > request.offer.availableSeats) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Plus assez de places' })
        }
      }

      const updated = await prisma.carpoolRequest.update({
        where: { id: request.id },
        data: { status: input.accept ? 'ACCEPTED' : 'DECLINED' },
      })

      await notify(
        request.passengerId,
        input.accept ? 'CARPOOL_ACCEPTED' : 'SYSTEM',
        input.accept ? 'Covoiturage confirmé 🚗' : 'Covoiturage refusé',
        input.accept
          ? `${ctx.user.firstName} vous emmène à « ${request.offer.event.title} »`
          : `${ctx.user.firstName} ne peut pas vous emmener à « ${request.offer.event.title} »`,
        { link: `/events/${request.offer.event.slug}` },
      )
      return updated
    }),

  /** Passager : annuler sa demande. */
  cancelRequest: protectedProcedure.input(z.object({ requestId: z.string() })).mutation(async ({ input, ctx }) => {
    const request = await prisma.carpoolRequest.findUnique({ where: { id: input.requestId } })
    if (!request || request.passengerId !== ctx.user.id) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Demande introuvable' })
    }
    await prisma.carpoolRequest.update({ where: { id: request.id }, data: { status: 'CANCELLED' } })
    return { ok: true }
  }),

  /** Conducteur : supprimer son offre. */
  deleteOffer: protectedProcedure.input(z.object({ offerId: z.string() })).mutation(async ({ input, ctx }) => {
    const offer = await prisma.carpoolOffer.findUnique({
      where: { id: input.offerId },
      include: { requests: { where: { status: 'ACCEPTED' }, select: { passengerId: true } }, event: { select: { slug: true, title: true } } },
    })
    if (!offer || offer.driverId !== ctx.user.id) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Trajet introuvable' })
    }
    await prisma.carpoolOffer.delete({ where: { id: offer.id } })
    for (const r of offer.requests) {
      await notify(r.passengerId, 'SYSTEM', 'Covoiturage annulé', `${ctx.user.firstName} a annulé son trajet pour « ${offer.event.title} »`, {
        link: `/events/${offer.event.slug}`,
      })
    }
    return { ok: true }
  }),
})
