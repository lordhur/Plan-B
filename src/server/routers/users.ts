import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { setInterestsSchema, updateProfileSchema } from '@/lib/validators'
import { prisma } from '../db'
import { distanceTo, geoWhere, resolveGeo, withinGeo } from '../geo'
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
  profession: true,
  education: true,
  averageRating: true,
  totalRatings: true,
  trustScore: true,
  eventsCreated: true,
  eventsAttended: true,
  friendCount: true,
  videoUrl: true,
  profilePhotos: { orderBy: { order: 'asc' }, take: 12 },
  favoriteCategories: { select: { id: true, slug: true, name: true, icon: true, color: true } },
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
    // Blocage : le profil disparaît dans les deux sens
    if (ctx.user && ctx.user.id !== input.id) {
      const blocked = await prisma.userBlock.count({
        where: {
          OR: [
            { blockerId: ctx.user.id, blockedId: input.id },
            { blockerId: input.id, blockedId: ctx.user.id },
          ],
        },
      })
      if (blocked > 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Profil introuvable' })
      }
    }
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

  /** Mes photos de profil. */
  myPhotos: protectedProcedure.query(({ ctx }) =>
    prisma.profilePhoto.findMany({
      where: { userId: ctx.user.id },
      orderBy: { order: 'asc' },
    }),
  ),

  /** Ajouter une photo de profil (max 12). La 1re devient l'avatar. */
  addPhoto: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input, ctx }) => {
      const count = await prisma.profilePhoto.count({ where: { userId: ctx.user.id } })
      if (count >= 12) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Maximum 12 photos de profil' })
      }
      const isFirst = count === 0
      const [photo] = await prisma.$transaction([
        prisma.profilePhoto.create({
          data: {
            userId: ctx.user.id,
            url: input.url,
            isPrimary: isFirst,
            order: count,
          },
        }),
        // La toute première photo doit IMMÉDIATEMENT devenir la photo de profil.
        ...(isFirst
          ? [prisma.user.update({ where: { id: ctx.user.id }, data: { avatarUrl: input.url } })]
          : []),
      ])
      return { ...photo, becameAvatar: isFirst }
    }),

  /** Réordonner mes photos (glisser-déposer / flèches). */
  reorderPhotos: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1).max(12) }))
    .mutation(async ({ input, ctx }) => {
      const mine = await prisma.profilePhoto.findMany({
        where: { userId: ctx.user.id },
        select: { id: true },
      })
      const owned = new Set(mine.map((p) => p.id))
      if (input.ids.some((id) => !owned.has(id))) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Photo inconnue' })
      }
      await prisma.$transaction(
        input.ids.map((id, index) =>
          prisma.profilePhoto.update({ where: { id }, data: { order: index } }),
        ),
      )
      return { ok: true as const }
    }),

  /** Supprimer une photo de profil (l'avatar suit si c'était la principale). */
  removePhoto: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const photo = await prisma.profilePhoto.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!photo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo introuvable' })
      await prisma.profilePhoto.delete({ where: { id: photo.id } })
      if (photo.isPrimary) {
        const next = await prisma.profilePhoto.findFirst({
          where: { userId: ctx.user.id },
          orderBy: { order: 'asc' },
        })
        if (next) {
          await prisma.$transaction([
            prisma.profilePhoto.update({ where: { id: next.id }, data: { isPrimary: true } }),
            // L'avatar suit la nouvelle photo principale (ou redevient vide).
            prisma.user.update({ where: { id: ctx.user.id }, data: { avatarUrl: next.url } }),
          ])
        } else {
          await prisma.user.update({ where: { id: ctx.user.id }, data: { avatarUrl: null } })
        }
      }
      return { ok: true as const }
    }),

  /** Définir la photo principale (devient aussi l'avatar). */
  setPrimaryPhoto: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const photo = await prisma.profilePhoto.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      })
      if (!photo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo introuvable' })
      await prisma.$transaction([
        prisma.profilePhoto.updateMany({
          where: { userId: ctx.user.id },
          data: { isPrimary: false },
        }),
        prisma.profilePhoto.update({ where: { id: photo.id }, data: { isPrimary: true } }),
        prisma.user.update({ where: { id: ctx.user.id }, data: { avatarUrl: photo.url } }),
      ])
      return { ok: true as const, avatarUrl: photo.url }
    }),

  /** Mes catégories favorites (slugs). */
  setFavoriteCategories: protectedProcedure
    .input(z.object({ slugs: z.array(z.string()).max(12) }))
    .mutation(async ({ input, ctx }) => {
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          favoriteCategories: { set: input.slugs.map((slug) => ({ slug })) },
        },
      })
      return { ok: true as const }
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
        minLat: z.number().optional(),
        maxLat: z.number().optional(),
        minLon: z.number().optional(),
        maxLon: z.number().optional(),
        lat: z.number().optional(),
        lon: z.number().optional(),
        radiusKm: z.number().min(1).max(300).optional(),
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
      // Zone (région/département) ou rayon autour de la ville / position GPS :
      // même jauge de kilomètres que la carte et le fil d'actualité.
      const geo = resolveGeo(input)
      Object.assign(where, geoWhere(geo))
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
        // Avec un rayon, on sur-échantillonne puis on affine par distance exacte.
        take: geo.center || geo.box ? 200 : input.limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true,
          city: true,
          latitude: true,
          longitude: true,
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

      const filtered = users.filter((u) => withinGeo(geo, u.latitude, u.longitude))

      if (geo.center) {
        filtered.sort((a, b) => {
          const da = distanceTo(geo, a.latitude, a.longitude) ?? Number.MAX_SAFE_INTEGER
          const db = distanceTo(geo, b.latitude, b.longitude) ?? Number.MAX_SAFE_INTEGER
          return da - db
        })
      }

      return filtered.slice(0, input.limit).map((u) => ({
        id: u.id,
        firstName: u.firstName,
        lastName: u.showLastName ? u.lastName : '',
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        city: u.city,
        latitude: u.latitude,
        longitude: u.longitude,
        distanceKm: distanceTo(geo, u.latitude, u.longitude),
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
