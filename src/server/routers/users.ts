import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { setInterestsSchema, updateProfileSchema } from '@/lib/validators'
import { prisma } from '../db'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc'

/** Sous-ensemble public d'un profil (respecte les réglages de confidentialité). */
const publicProfileSelect = {
  id: true,
  firstName: true,
  lastName: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  city: true,
  dateOfBirth: true,
  showAge: true,
  showLastName: true,
  gender: true,
  averageRating: true,
  totalRatings: true,
  trustScore: true,
  eventsCreated: true,
  eventsAttended: true,
  friendCount: true,
  createdAt: true,
  privacyLevel: true,
  interests: { select: { id: true, name: true, icon: true } },
  badges: {
    include: { badge: { select: { code: true, name: true, icon: true, color: true, description: true, category: true } } },
    orderBy: { earnedAt: 'desc' },
    take: 12,
  },
} as const

export const usersRouter = createTRPCRouter({
  /** Liste des centres d'intérêt disponibles (onboarding). */
  interests: publicProcedure.query(() => prisma.interest.findMany({ orderBy: { name: 'asc' } })),

  /** Profil public d'un utilisateur. */
  byId: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const profile = await prisma.user.findUnique({
      where: { id: input.id },
      select: publicProfileSelect,
    })
    if (!profile || profile.privacyLevel === 'PRIVATE') {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Profil introuvable' })
    }
    // Phase 1 : FRIENDS_ONLY traité comme public simplifié (système d'amis en Phase 2)
    return {
      ...profile,
      isMe: ctx.user?.id === profile.id,
    }
  }),

  /** Mise à jour de mon profil. */
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      const data: Record<string, unknown> = { ...input }
      // Téléphone modifié → repasse en non-vérifié (nouveau code requis)
      if (input.phone !== undefined) {
        if (input.phone === '') {
          data.phone = null
          data.phoneVerified = false
        } else {
          data.phone = input.phone
          data.phoneVerified = false
        }
      }
      const user = await prisma.user.update({
        where: { id: ctx.user.id },
        data,
        select: { id: true, email: true, firstName: true, lastName: true, city: true },
      })
      return user
    }),

  /** Sélection des centres d'intérêt (onboarding / préférences). */
  setInterests: protectedProcedure
    .input(setInterestsSchema)
    .mutation(async ({ input, ctx }) => {
      // Crée les intérêts manquants puis remplace la sélection de l'utilisateur
      await Promise.all(
        input.interests.map((name) =>
          prisma.interest.upsert({ where: { name }, update: {}, create: { name } }),
        ),
      )
      const interests = await prisma.interest.findMany({
        where: { name: { in: input.interests } },
        select: { id: true },
      })
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { interests: { set: interests } },
      })
      return { count: interests.length }
    }),

  /** Position géographique (onboarding : « autour de moi »). */
  setLocation: protectedProcedure
    .input(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        city: z.string().max(80).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          latitude: input.latitude,
          longitude: input.longitude,
          ...(input.city ? { city: input.city } : {}),
        },
      })
      return { ok: true }
    }),

  /** Avis reçus (page profil). */
  ratings: publicProcedure
    .input(z.object({ userId: z.string(), limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ input }) => {
      return prisma.userRating.findMany({
        where: { toId: input.userId },
        include: {
          from: {
            select: { id: true, firstName: true, lastName: true, displayName: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      })
    }),
})
