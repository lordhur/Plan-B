import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { ageFromBirthDate, haversineKm, slugify } from '@/lib/utils'
import { createEventSchema, eventFiltersSchema } from '@/lib/validators'
import { computeFeedScore } from '@/lib/feed'
import { prisma } from '../db'
import { notify } from '../notifications'
import { promoteFromWaitlist } from '../waitlist'
import { createTRPCRouter, protectedProcedure, publicProcedure, verifiedProcedure } from '../trpc'
import type { Event, EventCategory, User } from '@/generated/prisma/client'

/** Sélection partagée pour les listes d'événements. */
const eventCardInclude = {
  category: { select: { id: true, name: true, slug: true, icon: true, color: true } },
  organizer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      avatarUrl: true,
      averageRating: true,
      totalRatings: true,
      trustScore: true,
    },
  },
} as const

const publicEventSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  shortDescription: true,
  coverImage: true,
  startDate: true,
  endDate: true,
  locationName: true,
  address: true,
  city: true,
  latitude: true,
  longitude: true,
  isOnline: true,
  onlineLink: true,
  maxParticipants: true,
  currentParticipants: true,
  registrationType: true,
  minAge: true,
  maxAge: true,
  genderRestriction: true,
  minRating: true,
  wheelchairAccessible: true,
  hearingAccessible: true,
  visuallyAccessible: true,
  accessibilityNotes: true,
  visibility: true,
  isFree: true,
  price: true,
  currency: true,
  status: true,
  isSponsored: true,
  tags: true,
  viewCount: true,
  createdAt: true,
} as const

type EventCard = Event & {
  category: Pick<EventCategory, 'id' | 'name' | 'slug' | 'icon' | 'color'>
  organizer: Pick<
    User,
    'id' | 'firstName' | 'lastName' | 'displayName' | 'avatarUrl' | 'averageRating' | 'totalRatings' | 'trustScore'
  >
}

/** Vérifie qu'un utilisateur remplit les restrictions d'un événement. */
async function checkEligibility(
  user: { id: string; dateOfBirth: Date; gender: string; averageRating: number },
  event: Pick<
    Event,
    'minAge' | 'maxAge' | 'genderRestriction' | 'minRating' | 'status' | 'visibility' | 'registrationType'
  >,
): Promise<string | null> {
  if (event.status === 'CANCELLED') return 'Cet événement est annulé'
  if (event.status === 'COMPLETED') return 'Cet événement est terminé'
  if (event.status === 'ONGOING') return 'Cet événement est déjà en cours'
  if (event.status === 'DRAFT') return 'Cet événement est un brouillon'

  const age = ageFromBirthDate(user.dateOfBirth)
  if (event.minAge != null && age < event.minAge) return `Réservé aux ${event.minAge} ans et plus`
  if (event.maxAge != null && age > event.maxAge) return `Réservé aux ${event.maxAge} ans et moins`

  if (event.genderRestriction !== 'ALL') {
    const expected = { MALE_ONLY: 'MALE', FEMALE_ONLY: 'FEMALE', NON_BINARY_ONLY: 'NON_BINARY' }[
      event.genderRestriction
    ]
    if (expected && user.gender !== expected) return 'Cet événement ne correspond pas à votre profil'
  }

  if (event.minRating != null && user.averageRating < event.minRating) {
    return `Note de profil minimale requise : ${event.minRating}★`
  }

  if (event.visibility === 'PRIVATE') return 'Événement privé — sur invitation uniquement'

  return null
}

export const eventsRouter = createTRPCRouter({
  /** Catégories d'événements (pour filtres et formulaire). */
  categories: publicProcedure.query(() =>
    prisma.eventCategory.findMany({ orderBy: { name: 'asc' } }),
  ),

  /** Fil d'actualité : plans à venir, classés par l'algorithme de pertinence. */
  feed: publicProcedure
    .input(
      z.object({
        latitude: z.number().nullish(),
        longitude: z.number().nullish(),
        limit: z.number().int().min(1).max(50).default(30),
      }),
    )
    .query(async ({ input, ctx }) => {
      const user = ctx.user
        ? await prisma.user.findUnique({
            where: { id: ctx.user.id },
            select: {
              id: true,
              latitude: true,
              longitude: true,
              interests: { select: { name: true } },
              favoriteCategories: { select: { id: true } },
            },
          })
        : null

      const lat = input.latitude ?? user?.latitude ?? null
      const lon = input.longitude ?? user?.longitude ?? null

      const [upcoming, myParticipations] = await Promise.all([
        prisma.event.findMany({
          where: {
            status: 'UPCOMING',
            visibility: { in: ['PUBLIC', 'UNLISTED'] },
            startDate: { gte: new Date() },
          },
          include: eventCardInclude,
          orderBy: { startDate: 'asc' },
          take: 100,
        }),
        user
          ? prisma.eventParticipation.findMany({
              where: { userId: user.id ?? '', status: { in: ['CONFIRMED', 'PENDING'] } },
              select: { eventId: true, status: true },
            })
          : Promise.resolve([]),
      ])

      const participationMap = new Map(myParticipations.map((p) => [p.eventId, p.status]))

      const scored = upcoming
        .map((event) => ({
          event,
          score: computeFeedScore(event as never, {
            latitude: lat,
            longitude: lon,
            interests: user?.interests.map((i) => i.name) ?? [],
            favoriteCategoryIds: user?.favoriteCategories.map((c) => c.id) ?? [],
          }),
          distanceKm:
            lat != null && lon != null
              ? haversineKm(lat, lon, event.latitude, event.longitude)
              : null,
          myStatus: participationMap.get(event.id) ?? null,
          isOrganizer: user ? event.organizerId === user.id : false,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, input.limit)

      // Sections du fil : "Près de vous" (≤ 25 km) puis "Pour vous"
      const near = scored.filter((s) => s.distanceKm != null && s.distanceKm <= 25)
      const forYou = scored.filter((s) => s.distanceKm == null || s.distanceKm > 25)

      return {
        near,
        forYou,
        all: scored,
      }
    }),

  /** Recherche/filtres — page Explorer. */
  search: publicProcedure.input(eventFiltersSchema).query(async ({ input }) => {
    const startDate: { gte: Date; lte?: Date } = { gte: new Date() }
    if (input.dateFrom) startDate.gte = input.dateFrom
    if (input.dateTo) startDate.lte = input.dateTo

    const where: Record<string, unknown> = {
      status: 'UPCOMING',
      visibility: { in: ['PUBLIC', 'UNLISTED'] },
      startDate,
    }
    if (input.categoryId) where.categoryId = input.categoryId
    if (input.isFree != null) where.isFree = input.isFree
    if (input.wheelchairAccessible) where.wheelchairAccessible = true
    if (input.search) {
      where.OR = [
        { title: { contains: input.search, mode: 'insensitive' } },
        { description: { contains: input.search, mode: 'insensitive' } },
        { city: { contains: input.search, mode: 'insensitive' } },
        { tags: { has: input.search.toLowerCase() } },
      ]
    }

    let events = (await prisma.event.findMany({
      where,
      include: eventCardInclude,
      orderBy: { startDate: 'asc' },
      take: 100,
    })) as EventCard[]

    // Filtre géographique (haversine côté serveur — PostGIS en production à scale)
    let withDistance = events.map((event) => ({
      event,
      distanceKm:
        input.latitude != null && input.longitude != null
          ? haversineKm(input.latitude, input.longitude, event.latitude, event.longitude)
          : null,
    }))

    if (input.maxDistanceKm != null && input.latitude != null && input.longitude != null) {
      withDistance = withDistance.filter(
        (e) => e.distanceKm != null && e.distanceKm <= input.maxDistanceKm!,
      )
    }

    switch (input.sort) {
      case 'date':
        withDistance.sort((a, b) => a.event.startDate.getTime() - b.event.startDate.getTime())
        break
      case 'distance':
        withDistance.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9))
        break
      case 'popularity':
        withDistance.sort((a, b) => b.event.currentParticipants - a.event.currentParticipants)
        break
      default:
        break
    }

    const paged = withDistance.slice(0, input.limit)
    return {
      results: paged,
      total: withDistance.length,
      nextCursor: paged.length === input.limit ? String(paged.length) : undefined,
    }
  }),

  /** Détail d'un événement par slug (+ statut de participation du visiteur). */
  bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input, ctx }) => {
    const event = await prisma.event.findUnique({
      where: { slug: input.slug },
      include: {
        ...eventCardInclude,
        organizer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            averageRating: true,
            totalRatings: true,
            trustScore: true,
            eventsCreated: true,
            eventsAttended: true,
            badges: { include: { badge: true }, take: 8 },
          },
        },
        page: { select: { id: true, name: true, slug: true, avatarUrl: true, isVerified: true } },
        participations: {
          where: { status: { in: ['CONFIRMED', 'PENDING', 'ATTENDED'] } },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                displayName: true,
                avatarUrl: true,
                averageRating: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
          take: 30,
        },
        waitlist: { orderBy: { position: 'asc' }, select: { id: true, userId: true, position: true } },
        invitations: ctx.user
          ? { where: { userId: ctx.user.id }, select: { id: true, status: true } }
          : false,
      },
    })
    if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'Événement introuvable' })

    // Visibilité
    if (event.visibility === 'PRIVATE' && event.organizerId !== ctx.user?.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Événement privé' })
    }

    await prisma.event.update({
      where: { id: event.id },
      data: { viewCount: { increment: 1 } },
    })

    let myParticipation = null
    let myWaitlistPosition = null
    if (ctx.user) {
      myParticipation = await prisma.eventParticipation.findUnique({
        where: { eventId_userId: { eventId: event.id, userId: ctx.user.id } },
        select: { id: true, status: true, joinedAt: true },
      })
      const wl = await prisma.waitlistEntry.findUnique({
        where: { eventId_userId: { eventId: event.id, userId: ctx.user.id } },
        select: { position: true },
      })
      myWaitlistPosition = wl?.position ?? null
    }

    const isFull =
      event.maxParticipants != null && event.currentParticipants >= event.maxParticipants

    return {
      ...event,
      isFull,
      myParticipation,
      myWaitlistPosition,
      isOrganizer: ctx.user?.id === event.organizerId,
      shareUrl: `/join/${event.shareToken}`,
    }
  }),

  /** Page virale : détail via shareToken (accessible sans compte). */
  byShareToken: publicProcedure.input(z.object({ token: z.string() })).query(async ({ input, ctx }) => {
    const event = await prisma.event.findUnique({
      where: { shareToken: input.token },
      include: eventCardInclude,
    })
    if (!event || event.status === 'DRAFT') {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan introuvable ou expiré' })
    }
    let myParticipation = null
    if (ctx.user) {
      myParticipation = await prisma.eventParticipation.findUnique({
        where: { eventId_userId: { eventId: event.id, userId: ctx.user.id } },
        select: { id: true, status: true },
      })
    }
    const isFull =
      event.maxParticipants != null && event.currentParticipants >= event.maxParticipants
    return {
      ...event,
      isFull,
      myParticipation,
      isOrganizer: ctx.user?.id === event.organizerId,
    }
  }),

  /** Création d'événement (formulaire multi-étapes). */
  create: verifiedProcedure.input(createEventSchema).mutation(async ({ input, ctx }) => {
    // Anti-abus : max 5 créations/jour pour les comptes récents (spec sécurité)
    const today = new Date(Date.now() - 24 * 3600 * 1000)
    const recentCount = await prisma.event.count({
      where: { organizerId: ctx.user.id, createdAt: { gte: today } },
    })
    if (recentCount >= 5 && ctx.user.eventsCreated < 10) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Limite de 5 plans par 24 h atteinte (comptes récents)',
      })
    }

    const category = await prisma.eventCategory.findUnique({ where: { id: input.categoryId } })
    if (!category) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Catégorie inconnue' })

    // Slug unique
    const baseSlug = slugify(input.title) || 'plan'
    let slug = baseSlug
    for (let i = 2; ; i++) {
      const exists = await prisma.event.findUnique({ where: { slug } })
      if (!exists) break
      slug = `${baseSlug}-${i}`
    }

    const event = await prisma.event.create({
      data: {
        ...input,
        slug,
        price: input.isFree ? 0 : input.price ?? 0,
        status: input.isDraft ? 'DRAFT' : 'UPCOMING',
        organizerId: ctx.user.id,
        tags: input.tags.map((t) => t.toLowerCase()),
        visibility: input.isDraft ? 'UNLISTED' : input.visibility,
      },
    })

    // L'organisateur participe automatiquement à son événement
    if (!input.isDraft) {
      await prisma.$transaction([
        prisma.eventParticipation.create({
          data: { eventId: event.id, userId: ctx.user.id, status: 'CONFIRMED' },
        }),
        prisma.event.update({
          where: { id: event.id },
          data: { currentParticipants: 1 },
        }),
        prisma.user.update({
          where: { id: ctx.user.id },
          data: { eventsCreated: { increment: 1 } },
        }),
      ])
    }

    return { id: event.id, slug: event.slug, shareToken: event.shareToken }
  }),

  /** Rejoindre un plan (ou entrer en liste d'attente / demande de validation). */
  join: verifiedProcedure.input(z.object({ eventId: z.string() })).mutation(async ({ input, ctx }) => {
    const event = await prisma.event.findUnique({ where: { id: input.eventId } })
    if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'Événement introuvable' })
    return joinEvent(event, ctx.user)
  }),

  /** Rejoindre via lien de partage (boucle virale). */
  joinByShareToken: verifiedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const event = await prisma.event.findUnique({ where: { shareToken: input.token } })
      if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan introuvable' })
      return joinEvent(event, ctx.user)
    }),



  /** Se désister (avec promotion automatique de la liste d'attente). */
  leave: protectedProcedure.input(z.object({ eventId: z.string() })).mutation(async ({ input, ctx }) => {
    const participation = await prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId: input.eventId, userId: ctx.user.id } },
      include: { event: true },
    })

    // En liste d'attente plutôt que participant ?
    const waitlist = await prisma.waitlistEntry.findUnique({
      where: { eventId_userId: { eventId: input.eventId, userId: ctx.user.id } },
    })
    if (waitlist) {
      await prisma.waitlistEntry.delete({ where: { id: waitlist.id } })
      // Re-positionne la file
      await prisma.waitlistEntry.updateMany({
        where: { eventId: input.eventId, position: { gt: waitlist.position } },
        data: { position: { decrement: 1 } },
      })
      return { ok: true, wasWaitlisted: true }
    }

    if (!participation) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Vous ne participez pas à ce plan' })
    }
    if (participation.event.organizerId === ctx.user.id) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: "L'organisateur ne peut pas se désister — annulez le plan à la place" })
    }
    if (['ATTENDED', 'NO_SHOW'].includes(participation.status)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Événement terminé' })
    }

    await prisma.$transaction([
      prisma.eventParticipation.delete({ where: { id: participation.id } }),
      ...(participation.status === 'CONFIRMED'
        ? [
            prisma.event.update({
              where: { id: input.eventId },
              data: { currentParticipants: { decrement: 1 } },
            }),
          ]
        : []),
    ])

    await notify(
      participation.event.organizerId,
      'EVENT_PARTICIPANT_LEFT',
      'Un participant se désiste',
      `${ctx.user.firstName} ${ctx.user.lastName} a quitté « ${participation.event.title} »`,
      { link: `/events/${participation.event.slug}` },
    )

    // Promotion de la liste d'attente
    if (participation.status === 'CONFIRMED') {
      await promoteFromWaitlist(input.eventId)
    }

    return { ok: true, wasWaitlisted: false }
  }),

  /** Validation/refus d'une demande de participation (organisateur). */
  reviewParticipant: protectedProcedure
    .input(z.object({ participationId: z.string(), approve: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const participation = await prisma.eventParticipation.findUnique({
        where: { id: input.participationId },
        include: { event: true },
      })
      if (!participation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Demande introuvable' })
      if (participation.event.organizerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé à l\'organisateur' })
      }
      if (participation.status !== 'PENDING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Demande déjà traitée' })
      }

      if (input.approve) {
        await prisma.$transaction([
          prisma.eventParticipation.update({
            where: { id: participation.id },
            data: { status: 'CONFIRMED' },
          }),
          prisma.event.update({
            where: { id: participation.eventId },
            data: { currentParticipants: { increment: 1 } },
          }),
        ])
      } else {
        await prisma.eventParticipation.update({
          where: { id: participation.id },
          data: { status: 'DECLINED' },
        })
      }

      await notify(
        participation.userId,
        input.approve ? 'PARTICIPATION_APPROVED' : 'PARTICIPATION_DECLINED',
        input.approve ? 'Demande acceptée ✅' : 'Demande refusée',
        input.approve
          ? `Vous participez à « ${participation.event.title} »`
          : `Votre demande pour « ${participation.event.title} » n'a pas été retenue`,
        { link: `/events/${participation.event.slug}` },
      )

      return { ok: true }
    }),

  /** Annuler un événement (organisateur). */
  cancel: protectedProcedure
    .input(z.object({ eventId: z.string(), reason: z.string().max(500).optional() }))
    .mutation(async ({ input, ctx }) => {
      const event = await prisma.event.findUnique({
        where: { id: input.eventId },
        include: { participations: { select: { userId: true } } },
      })
      if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'Événement introuvable' })
      if (event.organizerId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé à l\'organisateur' })
      }

      await prisma.event.update({
        where: { id: event.id },
        data: { status: 'CANCELLED', cancelReason: input.reason },
      })

      // Notification de tous les participants
      await prisma.notification.createMany({
        data: event.participations
          .filter((p) => p.userId !== ctx.user.id)
          .map((p) => ({
            userId: p.userId,
            type: 'EVENT_CANCELLED' as const,
            title: 'Plan annulé 😕',
            body: `« ${event.title} » a été annulé${input.reason ? ` : ${input.reason}` : ''}`,
            link: `/events/${event.slug}`,
          })),
      })

      // Remboursements Stripe automatiques — Phase 4
      return { ok: true }
    }),

  /** Mes événements (profil : à venir / passés / organisés). */
  mine: protectedProcedure
    .input(z.object({ role: z.enum(['organized', 'participating', 'past']).default('participating') }))
    .query(async ({ input, ctx }) => {
      const now = new Date()
      if (input.role === 'organized') {
        return prisma.event.findMany({
          where: { organizerId: ctx.user.id },
          include: eventCardInclude,
          orderBy: { startDate: 'desc' },
          take: 50,
        })
      }
      return prisma.event.findMany({
        where: {
          participations: {
            some: { userId: ctx.user.id, status: { in: ['CONFIRMED', 'PENDING', 'ATTENDED'] } },
          },
          ...(input.role === 'past'
            ? { startDate: { lt: now } }
            : { startDate: { gte: now }, status: { in: ['UPCOMING', 'ONGOING'] } }),
        },
        include: eventCardInclude,
        orderBy: { startDate: input.role === 'past' ? 'desc' : 'asc' },
        take: 50,
      })
    }),
})

type SessionUserForJoin = {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: string
  averageRating: number
}

/**
 * Logique commune d'inscription à un plan :
 * éligibilité → liste d'attente si complet → PENDING si validation requise → CONFIRMED.
 */
async function joinEvent(event: Event, user: SessionUserForJoin) {
  if (event.organizerId === user.id) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Vous organisez déjà ce plan' })
  }

  const eligibility = await checkEligibility(user, event)
  if (eligibility) throw new TRPCError({ code: 'FORBIDDEN', message: eligibility })

  // Déjà inscrit ?
  const existing = await prisma.eventParticipation.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
  })
  if (existing && ['CONFIRMED', 'PENDING', 'ATTENDED'].includes(existing.status)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Vous participez déjà à ce plan' })
  }
  // Ré-inscription après annulation → on repart d'une participation neuve
  if (existing) {
    await prisma.eventParticipation.delete({ where: { id: existing.id } })
  }

  const alreadyWaitlisted = await prisma.waitlistEntry.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
  })
  if (alreadyWaitlisted) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: "Vous êtes déjà en liste d'attente" })
  }

  // Sur invitation uniquement ?
  if (event.registrationType === 'INVITATION_ONLY') {
    const invitation = await prisma.eventInvitation.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
    })
    if (!invitation || invitation.status === 'DECLINED') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Cet événement est sur invitation uniquement' })
    }
  }

  const isFull = event.maxParticipants != null && event.currentParticipants >= event.maxParticipants

  // Liste d'attente automatique si complet
  if (isFull) {
    const maxPos = await prisma.waitlistEntry.aggregate({
      where: { eventId: event.id },
      _max: { position: true },
    })
    const position = (maxPos._max.position ?? 0) + 1
    await prisma.waitlistEntry.create({
      data: { eventId: event.id, userId: user.id, position },
    })
    return { result: 'WAITLISTED' as const, position }
  }

  // Sur validation → statut PENDING
  const status = event.registrationType === 'APPROVAL_REQUIRED' ? 'PENDING' : 'CONFIRMED'

  await prisma.$transaction([
    prisma.eventParticipation.create({
      data: { eventId: event.id, userId: user.id, status },
    }),
    ...(status === 'CONFIRMED'
      ? [
          prisma.event.update({
            where: { id: event.id },
            data: { currentParticipants: { increment: 1 } },
          }),
        ]
      : []),
  ])

  await notify(
    event.organizerId,
    'EVENT_NEW_PARTICIPANT',
    status === 'CONFIRMED' ? 'Nouveau participant 👋' : 'Demande de participation ✋',
    `${user.firstName} ${user.lastName} ${
      status === 'CONFIRMED' ? 'a rejoint' : 'souhaite rejoindre'
    } « ${event.title} »`,
    { link: `/events/${event.slug}`, data: { eventId: event.id, userId: user.id } },
  )

  return { result: status === 'CONFIRMED' ? ('JOINED' as const) : ('PENDING' as const), position: null }
}
