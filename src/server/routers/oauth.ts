import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc'
import { prisma } from '../db'
import { fetchPhotos, isProviderConfigured, type OAuthProvider } from '@/lib/oauth'

const PROVIDERS: OAuthProvider[] = ['google', 'facebook', 'instagram']

export const oauthRouter = createTRPCRouter({
  /** Fournisseurs activés (identifiants présents côté serveur). */
  providers: publicProcedure.query(() =>
    Object.fromEntries(PROVIDERS.map((p) => [p, isProviderConfigured(p)])) as Record<
      OAuthProvider,
      boolean
    >,
  ),

  /** Comptes sociaux reliés à mon profil. */
  myAccounts: protectedProcedure.query(({ ctx }) =>
    prisma.connectedAccount.findMany({
      where: { userId: ctx.user.id },
      select: {
        id: true,
        provider: true,
        email: true,
        photosSyncedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ),

  /**
   * Synchronise les photos Facebook/Instagram vers mes photos de profil.
   * Les photos deviennent disponibles pour l'avatar et les albums (spec).
   */
  syncPhotos: protectedProcedure
    .input(z.object({ provider: z.enum(['google', 'facebook', 'instagram']) }))
    .mutation(async ({ input, ctx }) => {
      const account = await prisma.connectedAccount.findFirst({
        where: { userId: ctx.user.id, provider: input.provider },
      })
      if (!account) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Compte non relié — connectez-vous d’abord avec ce fournisseur.',
        })
      }
      if (!account.accessToken) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Jeton indisponible — reconnectez ce compte.',
        })
      }

      const urls = await fetchPhotos(input.provider, account.accessToken)
      if (urls.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            input.provider === 'facebook'
              ? 'Aucune photo accessible — l’autorisation « user_photos » doit être accordée par Meta (examen de l’application).'
              : 'Aucune photo accessible sur ce compte.',
        })
      }

      // Dédoublonnage : on n'importe pas deux fois la même URL
      const existing = await prisma.profilePhoto.findMany({
        where: { userId: ctx.user.id },
        select: { url: true },
      })
      const known = new Set(existing.map((p) => p.url))
      const fresh = urls.filter((u) => !known.has(u)).slice(0, 24)

      const first = await prisma.profilePhoto.findFirst({
        where: { userId: ctx.user.id },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      let order = (first?.order ?? 0) + 1

      for (const u of fresh) {
        await prisma.profilePhoto.create({
          data: { userId: ctx.user.id, url: u, source: input.provider, order: order++ },
        })
      }
      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: { photosSyncedAt: new Date() },
      })
      return { imported: fresh.length }
    }),

  /** Déconnecte un compte social du profil. */
  disconnect: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const deleted = await prisma.connectedAccount.deleteMany({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (deleted.count === 0) throw new TRPCError({ code: 'NOT_FOUND' })
      return { ok: true }
    }),
})
