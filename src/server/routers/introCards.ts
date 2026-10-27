import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { prisma } from '../db'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc'

/** Fiches de présentation — créées volontairement par les membres pour se faire des amis. */
export const introCardsRouter = createTRPCRouter({
  /** Toutes les fiches, plus récentes d'abord. */
  list: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(60).default(40) }).nullish())
    .query(async ({ input }) => {
      const cards = await prisma.introCard.findMany({
        orderBy: { createdAt: 'desc' },
        take: input?.limit ?? 40,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatarUrl: true,
              city: true,
              dateOfBirth: true,
              showAge: true,
              gender: true,
              averageRating: true,
              totalRatings: true,
              privacyLevel: true,
            },
          },
        },
      })
      const now = new Date()
      return cards
        .filter((c) => c.user.privacyLevel !== 'PRIVATE')
        .map((c) => ({
          id: c.id,
          title: c.title,
          about: c.about,
          lookingFor: c.lookingFor,
          photoUrl: c.photoUrl,
          photos: c.photos,
          passions: c.passions,
          profession: c.profession,
          education: c.education,
          createdAt: c.createdAt,
          user: {
            id: c.user.id,
            firstName: c.user.firstName,
            lastName: c.user.lastName,
            displayName: c.user.displayName,
            avatarUrl: c.user.avatarUrl,
            city: c.user.city,
            age:
              c.user.showAge && c.user.dateOfBirth
                ? (() => {
                    let age = now.getFullYear() - c.user.dateOfBirth!.getFullYear()
                    const m = now.getMonth() - c.user.dateOfBirth!.getMonth()
                    if (m < 0 || (m === 0 && now.getDate() < c.user.dateOfBirth!.getDate())) age--
                    return age
                  })()
                : null,
            gender: c.user.gender,
            averageRating: c.user.averageRating,
            totalRatings: c.user.totalRatings,
          },
        }))
    }),

  /** Ma fiche (ou null). */
  me: protectedProcedure.query(({ ctx }) =>
    prisma.introCard.findUnique({ where: { userId: ctx.user.id } }),
  ),

  /** Créer ou mettre à jour ma fiche. */
  upsert: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(3, 'Titre trop court').max(80),
        about: z.string().trim().min(20, 'Décrivez-vous en 20 caractères minimum').max(2000),
        lookingFor: z.string().trim().max(200).optional().or(z.literal('')),
        photoUrl: z.string().trim().max(500).optional().or(z.literal('')),
        photos: z.array(z.string().trim().max(500)).max(6).default([]),
        passions: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
        profession: z.string().trim().max(120).optional().or(z.literal('')),
        education: z.string().trim().max(1000).optional().or(z.literal('')),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const card = await prisma.introCard.upsert({
        where: { userId: ctx.user.id },
        create: {
          userId: ctx.user.id,
          title: input.title,
          about: input.about,
          lookingFor: input.lookingFor || null,
          photoUrl: input.photoUrl || input.photos[0] || null,
          photos: input.photos,
          passions: input.passions,
          profession: input.profession || null,
          education: input.education || null,
        },
        update: {
          title: input.title,
          about: input.about,
          lookingFor: input.lookingFor || null,
          photoUrl: input.photoUrl || input.photos[0] || null,
          photos: input.photos,
          passions: input.passions,
          profession: input.profession || null,
          education: input.education || null,
        },
      })
      return card
    }),

  /** Supprimer ma fiche. */
  remove: protectedProcedure.mutation(async ({ ctx }) => {
    await prisma.introCard.deleteMany({ where: { userId: ctx.user.id } })
    return { ok: true }
  }),
})

/** Garde-fou : évite qu'un import oublié casse le typage. */
export type _IntroCardsRouter = typeof introCardsRouter
void TRPCError
