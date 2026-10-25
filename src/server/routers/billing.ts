import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { prisma } from '../db'
import { notify } from '../notifications'
import { centsToEuros, eurosToCents, payments } from '../payments'
import { PLANS } from '@/lib/constants'
import { createTRPCRouter, protectedProcedure } from '../trpc'

/**
 * Monétisation (spec Phase 4) :
 *  - Billetterie : achat/remboursement de billets pour les plans payants
 *  - Abonnements premium : ORGANIZER_PRO / PREMIUM / BUSINESS
 * Tous les flux passent par l'abstraction `payments` (mock en démo,
 * Stripe en production — voir src/server/payments.ts).
 */

export const billingRouter = createTRPCRouter({
  /** Mon abonnement (ou FREE). */
  mySubscription: protectedProcedure.query(async ({ ctx }) => {
    const sub = await prisma.subscription.findUnique({ where: { userId: ctx.user.id } })
    if (!sub || sub.status !== 'ACTIVE' || sub.currentPeriodEnd < new Date()) {
      return { plan: 'FREE' as const, sub: null }
    }
    return {
      plan: sub.plan,
      sub: {
        plan: sub.plan,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      },
    }
  }),

  /** Souscrire / changer de plan (paiement simulé en démo). */
  subscribe: protectedProcedure
    .input(z.object({ plan: z.enum(['ORGANIZER_PRO', 'PREMIUM', 'BUSINESS']) }))
    .mutation(async ({ input, ctx }) => {
      const plan = PLANS.find((p) => p.id === input.plan)
      if (!plan) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Plan inconnu' })

      const charge = await payments.charge({
        amountCents: eurosToCents(plan.price),
        currency: 'EUR',
        description: `Abonnement PlanB ${plan.name} — 1 mois`,
      })
      if (charge.status !== 'SUCCEEDED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Paiement refusé' })
      }

      const now = new Date()
      const end = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
      const sub = await prisma.subscription.upsert({
        where: { userId: ctx.user.id },
        update: {
          plan: input.plan,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: end,
          cancelAtPeriodEnd: false,
        },
        create: {
          userId: ctx.user.id,
          plan: input.plan,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: end,
        },
      })

      await notify(ctx.user.id, 'SYSTEM', `Bienvenue dans PlanB ${plan.name} 🎉`, plan.perks[0] ?? 'Merci de soutenir PlanB !', {
        link: '/premium',
      })
      return { ok: true, plan: sub.plan, paymentId: charge.paymentId }
    }),

  /** Annuler en fin de période (ou résilier immédiatement en démo). */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const sub = await prisma.subscription.findUnique({ where: { userId: ctx.user.id } })
    if (!sub || sub.status !== 'ACTIVE') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Aucun abonnement actif' })
    }
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true },
    })
    return { ok: true }
  }),

  /** Billetterie : acheter le billet d'un plan payant auquel je participe. */
  buyTicket: protectedProcedure.input(z.object({ eventId: z.string() })).mutation(async ({ input, ctx }) => {
    const [event, participation] = await Promise.all([
      prisma.event.findUnique({
        where: { id: input.eventId },
        select: { id: true, slug: true, title: true, status: true, price: true, currency: true, organizerId: true },
      }),
      prisma.eventParticipation.findUnique({
        where: { eventId_userId: { eventId: input.eventId, userId: ctx.user.id } },
      }),
    ])
    if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'Événement introuvable' })
    if (event.status !== 'UPCOMING') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'La billetterie est fermée' })
    }
    if (!participation || !['CONFIRMED', 'PENDING'].includes(participation.status)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Rejoignez d’abord le plan' })
    }
    if (participation.paymentId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Billet déjà acheté' })
    }
    const price = event.price ?? 0
    if (price <= 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ce plan est gratuit' })

    const charge = await payments.charge({
      amountCents: eurosToCents(price),
      currency: event.currency,
      description: `Billet — ${event.title}`,
    })
    if (charge.status !== 'SUCCEEDED') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Paiement refusé' })
    }

    await prisma.eventParticipation.update({
      where: { id: participation.id },
      data: {
        paymentId: charge.paymentId,
        amountPaid: price,
        ticketId: `tkt_${charge.paymentId.slice(-12)}`,
      },
    })

    await notify(ctx.user.id, 'SYSTEM', 'Billet confirmé 🎟️', `« ${event.title} » — ${centsToEuros(charge.amountCents)} €`, {
      link: `/events/${event.slug}`,
      data: { eventId: event.id },
    })
    return { ok: true, paymentId: charge.paymentId, amount: centsToEuros(charge.amountCents) }
  }),

  /** Billetterie : se faire rembourser et quitter le plan. */
  refundTicket: protectedProcedure.input(z.object({ eventId: z.string() })).mutation(async ({ input, ctx }) => {
    const [event, participation] = await Promise.all([
      prisma.event.findUnique({
        where: { id: input.eventId },
        select: { id: true, slug: true, title: true, status: true, organizerId: true, currentParticipants: true },
      }),
      prisma.eventParticipation.findUnique({
        where: { eventId_userId: { eventId: input.eventId, userId: ctx.user.id } },
      }),
    ])
    if (!event || !participation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Billet introuvable' })
    if (event.organizerId === ctx.user.id) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'L’organisateur ne peut pas quitter son propre plan ici' })
    }
    if (event.status !== 'UPCOMING') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Remboursement impossible après le début' })
    }
    if (!participation.paymentId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Aucun billet payé' })
    }

    await payments.refund(participation.paymentId, eurosToCents(participation.amountPaid ?? 0))

    await prisma.$transaction([
      prisma.eventParticipation.update({
        where: { id: participation.id },
        data: { status: 'CANCELLED', paymentId: null, amountPaid: null, ticketId: null },
      }),
      prisma.event.update({
        where: { id: event.id },
        data: { currentParticipants: { decrement: 1 } },
      }),
    ])

    await notify(ctx.user.id, 'SYSTEM', 'Billet remboursé 💸', `« ${event.title} » — remboursement effectué`, {
      link: `/events/${event.slug}`,
    })
    return { ok: true }
  }),
})
