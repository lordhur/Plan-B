import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { prisma } from '../db'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc'

/** Offres partenaires (spec Phase 4 §4.3) : bons plans locaux à utiliser une fois. */
export const offersRouter = createTRPCRouter({
  /** Offres valides du moment. */
  active: publicProcedure.query(async ({ ctx }) => {
    const now = new Date()
    const offers = await prisma.partnerOffer.findMany({
      where: { validFrom: { lte: now }, validUntil: { gte: now } },
      include: {
        partner: { select: { id: true, name: true, slug: true, logoUrl: true, type: true } },
        _count: { select: { redeemedOffers: true } },
      },
      orderBy: { validUntil: 'asc' },
    })
    let redeemedIds = new Set<string>()
    if (ctx.user) {
      const mine = await prisma.redeemedOffer.findMany({
        where: { userId: ctx.user.id, offerId: { in: offers.map((o) => o.id) } },
        select: { offerId: true },
      })
      redeemedIds = new Set(mine.map((m) => m.offerId))
    }
    return offers.map((o) => ({
      ...o,
      redeemed: redeemedIds.has(o.id),
      soldOut: o.maxRedemptions != null && o.currentRedemptions >= o.maxRedemptions,
    }))
  }),

  /** Utiliser une offre (une seule fois par membre). */
  redeem: protectedProcedure.input(z.object({ offerId: z.string() })).mutation(async ({ input, ctx }) => {
    const offer = await prisma.partnerOffer.findUnique({
      where: { id: input.offerId },
      include: { partner: { select: { name: true } } },
    })
    if (!offer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Offre introuvable' })
    const now = new Date()
    if (offer.validFrom > now || offer.validUntil < now) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Offre expirée ou pas encore active' })
    }
    if (offer.maxRedemptions != null && offer.currentRedemptions >= offer.maxRedemptions) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Offre épuisée' })
    }
    const existing = await prisma.redeemedOffer.findUnique({
      where: { offerId_userId: { offerId: offer.id, userId: ctx.user.id } },
    })
    if (existing) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Vous avez déjà utilisé cette offre' })

    await prisma.$transaction([
      prisma.redeemedOffer.create({ data: { offerId: offer.id, userId: ctx.user.id } }),
      prisma.partnerOffer.update({ where: { id: offer.id }, data: { currentRedemptions: { increment: 1 } } }),
    ])
    return { ok: true, partner: offer.partner.name, code: offer.discountCode }
  }),
})
