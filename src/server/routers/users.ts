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

  /** Annuaire des membres (« Les Membres ») — filtres combinables. */
  directory: publicProcedure
    .input(
      z.object({
        q: z.string().trim().max(60).optional(),
        gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
        orientation: z.enum(['HETEROSEXUAL', 'HOMOSEXUAL', 'BISEXUAL', 'OTHER']).optional(),
        minAge: z.number().int().min(15).max(120).optional(),
        maxAge: z.number().int().min(15).max(120).optional(),
        sort: z.enum(['recent', 'rating', 'active']).default('recent'),
        newThisMonth: z.boolean().default(false),
        verifiedOnly: z.boolean().default(false),
        organizersOnly: z.boolean().default(false),
        limit: z.number().int().min(1).max(60).default(40),
      }),
    )
    .query(async ({ input }) => {
      const now = new Date()
      const where: Record<string, unknown> = {
        privacyLevel: { not: 'PRIVATE' },
        emailVerified: true,
      }
      if (input.q) {
        where.OR = [
          { firstName: { contains: input.q, mode: 'insensitive' } },
          { lastName: { contains: input.q, mode: 'insensitive' } },
          { displayName: { contains: input.q, mode: 'insensitive' } },
          { city: { contains: input.q, mode: 'insensitive' } },
          { bio: { contains: input.q, mode: 'insensitive' } },
        ]
      }
      if (input.gender) {
        where.gender = input.gender === 'OTHER' ? { in: ['NON_BINARY', 'OTHER'] } : input.gender
      }
      if (input.orientation) where.orientation = input.orientation
      if (input.minAge || input.maxAge) {
        const dob: Record<string, Date> = {}
        // âge >= minAge ⇔ naissance <= aujourd'hui - minAge ans
        if (input.minAge) {
          dob.lte = new Date(now.getFullYear() - input.minAge, now.getMonth(), now.getDate())
        }
        // âge <= maxAge ⇔ naissance >= aujourd'hui - (maxAge + 1) ans + 1 jour
        if (input.maxAge) {
          dob.gte = new Date(now.getFullYear() - input.maxAge - 1, now.getMonth(), now.getDate() + 1)
        }
        where.dateOfBirth = dob
      }
      if (input.verifiedOnly) where.emailVerified = true
      if (input.organizersOnly) where.eventsCreated = { gt: 0 }
      if (input.newThisMonth) {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        where.createdAt = { gte: firstOfMonth }
      }

      const orderBy =
        input.sort === 'rating'
          ? [{ averageRating: 'desc' as const }, { totalRatings: 'desc' as const }]
          : input.sort === 'active'
            ? [{ eventsCreated: 'desc' as const }, { createdAt: 'desc' as const }]
            : [{ createdAt: 'desc' as const }]

      const users = await prisma.user.findMany({
        where,
        orderBy,
        take: input.limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true,
          city: true,
          bio: true,
          dateOfBirth: true,
          showAge: true,
          showLastName: true,
          gender: true,
          orientation: true,
          averageRating: true,
          totalRatings: true,
          eventsCreated: true,
          emailVerified: true,
          createdAt: true,
          interests: { select: { name: true }, take: 4 },
        },
      })

      const ageOf = (dob: Date) => {
        let age = now.getFullYear() - dob.getFullYear()
        const m = now.getMonth() - dob.getMonth()
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
        return age
      }

      return users.map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.showLastName ? u.lastName : '',
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        city: u.city,
        bio: u.bio,
        age: u.showAge ? ageOf(u.dateOfBirth) : null,
        gender: u.gender,
        orientation: u.orientation,
        averageRating: u.averageRating,
        totalRatings: u.totalRatings,
        eventsCreated: u.eventsCreated,
        isVerified: u.emailVerified,
        createdAt: u.createdAt,
        interests: u.interests.map((i) => i.name),
      }))
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
