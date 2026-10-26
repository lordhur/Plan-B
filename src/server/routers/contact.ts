import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { prisma } from '../db'
import { createTRPCRouter, publicProcedure } from '../trpc'

/** Formulaire « Contactez-nous » : problème, demande, partenariat… */
export const contactRouter = createTRPCRouter({
  send: publicProcedure
    .input(
      z.object({
        subject: z.enum(['PROBLEME', 'DEMANDE', 'PARTENARIAT', 'AUTRE']),
        message: z.string().trim().min(10, 'Message trop court (10 caractères min.)').max(4000),
        email: z.string().trim().email('Email invalide').max(160).optional(),
        name: z.string().trim().max(80).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const email = (input.email || ctx.user?.email || '').toLowerCase()
      if (!email) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Indiquez un email pour recevoir notre réponse.' })
      }

      // Anti-spam simple : 5 messages / heure / email
      const oneHourAgo = new Date(Date.now() - 3600 * 1000)
      const recent = await prisma.contactMessage.count({
        where: { email, createdAt: { gte: oneHourAgo } },
      })
      if (recent >= 5) {
        throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Trop de messages envoyés — réessayez plus tard.' })
      }

      await prisma.contactMessage.create({
        data: {
          userId: ctx.user?.id ?? null,
          email,
          name: input.name || (ctx.user ? `${ctx.user.firstName} ${ctx.user.lastName}` : null),
          subject: input.subject,
          message: input.message,
        },
      })

      return { ok: true }
    }),
})
