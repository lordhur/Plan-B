import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { prisma } from '../db'
import { notify } from '../notifications'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc'

const uploaderSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
} as const

/** Albums photos d'événements (spec Phase 3 §3.2). */
export const albumsRouter = createTRPCRouter({
  /** Album d'un événement (public : les souvenirs sont visibles par tous). */
  byEvent: publicProcedure.input(z.object({ eventId: z.string() })).query(async ({ input, ctx }) => {
    const album = await prisma.eventAlbum.findUnique({
      where: { eventId: input.eventId },
      include: {
        media: {
          orderBy: { createdAt: 'asc' },
          include: {
            uploader: { select: uploaderSelect },
            identifications: {
              include: { user: { select: uploaderSelect } },
            },
          },
        },
      },
    })

    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
      select: { id: true, slug: true, title: true, status: true, endDate: true, organizerId: true },
    })
    if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'Événement introuvable' })

    // Verrouillage 30 jours après la fin (cohérent avec la route d'upload)
    const locked =
      album?.isLocked === true ||
      (event.endDate != null && Date.now() - event.endDate.getTime() > 30 * 24 * 3600 * 1000)

    let canUpload = false
    if (ctx.user && !locked && (event.status === 'COMPLETED' || event.status === 'ONGOING')) {
      canUpload =
        event.organizerId === ctx.user.id ||
        (await prisma.eventParticipation.count({
          where: { eventId: event.id, userId: ctx.user.id, status: { in: ['CONFIRMED', 'ATTENDED'] } },
        })) > 0
    }

    return { event, album, locked, canUpload }
  }),

  /** Supprimer une photo (uploader ou organisateur). */
  deleteMedia: protectedProcedure.input(z.object({ mediaId: z.string() })).mutation(async ({ input, ctx }) => {
    const media = await prisma.media.findUnique({
      where: { id: input.mediaId },
      include: { album: { include: { event: { select: { organizerId: true } } } } },
    })
    if (!media) throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo introuvable' })
    if (media.uploaderId !== ctx.user.id && media.album.event.organizerId !== ctx.user.id) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Suppression réservée à l’auteur ou l’organisateur' })
    }
    await prisma.media.delete({ where: { id: media.id } })
    return { ok: true }
  }),

  /** Identifier un participant sur une photo. */
  identify: protectedProcedure
    .input(z.object({ mediaId: z.string(), userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const media = await prisma.media.findUnique({
        where: { id: input.mediaId },
        include: { album: { select: { eventId: true } } },
      })
      if (!media) throw new TRPCError({ code: 'NOT_FOUND', message: 'Photo introuvable' })

      const [me, target] = await Promise.all([
        prisma.eventParticipation.count({
          where: { eventId: media.album.eventId, userId: ctx.user.id, status: { in: ['CONFIRMED', 'ATTENDED'] } },
        }),
        prisma.eventParticipation.count({
          where: { eventId: media.album.eventId, userId: input.userId, status: { in: ['CONFIRMED', 'ATTENDED'] } },
        }),
      ])
      if (me === 0) throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux participants' })
      if (target === 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cette personne n’a pas participé' })

      const identification = await prisma.mediaIdentification.upsert({
        where: { mediaId_userId: { mediaId: media.id, userId: input.userId } },
        update: {},
        create: { mediaId: media.id, userId: input.userId, taggedBy: ctx.user.id },
      })

      if (input.userId !== ctx.user.id) {
        const tagger = await prisma.user.findUnique({
          where: { id: ctx.user.id },
          select: { firstName: true },
        })
        await notify(input.userId, 'SYSTEM', 'Vous avez été identifié sur une photo 📸', `${tagger?.firstName ?? 'Quelqu’un'} vous a tagué sur une photo de l’événement`, {
          link: `/events/${(await prisma.event.findUnique({ where: { id: media.album.eventId }, select: { slug: true } }))?.slug}/photos`,
        })
      }
      return identification
    }),

  /** Confirmer/refuser une identification. */
  reviewIdentification: protectedProcedure
    .input(z.object({ id: z.string(), confirm: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const identification = await prisma.mediaIdentification.findUnique({ where: { id: input.id } })
      if (!identification || identification.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Identification introuvable' })
      }
      if (input.confirm) {
        await prisma.mediaIdentification.update({ where: { id: identification.id }, data: { confirmed: true } })
        return { ok: true as const }
      }
      await prisma.mediaIdentification.delete({ where: { id: identification.id } })
      return { ok: true as const }
    }),

  /** Dernières photos/vidéos publiées sur les événements (fil d'actualité). */
  recent: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(30).default(18) }).nullish())
    .query(async ({ input }) => {
      const media = await prisma.media.findMany({
        where: { album: { event: { visibility: 'PUBLIC', status: { not: 'DRAFT' } } } },
        orderBy: { createdAt: 'desc' },
        take: input?.limit ?? 18,
        select: {
          id: true,
          url: true,
          thumbnailUrl: true,
          type: true,
          caption: true,
          createdAt: true,
          album: {
            select: {
              event: { select: { slug: true, title: true, city: true, startDate: true } },
            },
          },
        },
      })
      return media.map((m) => ({
        id: m.id,
        url: m.url,
        thumbnailUrl: m.thumbnailUrl ?? m.url,
        type: m.type,
        caption: m.caption,
        createdAt: m.createdAt,
        event: m.album.event,
      }))
    }),
  /** Mes albums personnels avec compte de photos et couverture. */
  myAlbums: protectedProcedure.query(async ({ ctx }) => {
    const albums = await prisma.photoAlbum.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
      include: { photos: { orderBy: { order: 'asc' }, select: { id: true, url: true } } },
    })
    return albums.map((a) => ({
      id: a.id,
      name: a.name,
      isPublic: a.isPublic,
      createdAt: a.createdAt,
      count: a.photos.length,
      coverUrl: a.coverUrl ?? a.photos[0]?.url ?? null,
    }))
  }),

  /** Créer un album personnel. */
  createAlbum: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(80), isPublic: z.boolean().default(true) }))
    .mutation(async ({ input, ctx }) =>
      prisma.photoAlbum.create({
        data: { userId: ctx.user.id, name: input.name.trim(), isPublic: input.isPublic },
        select: { id: true, name: true, isPublic: true, createdAt: true },
      }),
    ),

  /** Renommer / visibilité d'un album. */
  updateAlbum: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(80).optional(),
        isPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const album = await prisma.photoAlbum.findFirst({ where: { id: input.id, userId: ctx.user.id } })
      if (!album) throw new TRPCError({ code: 'NOT_FOUND' })
      return prisma.photoAlbum.update({
        where: { id: input.id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
        },
        select: { id: true, name: true, isPublic: true },
      })
    }),

  /** Supprimer un album (les photos restent dans le profil). */
  deleteAlbum: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
    const album = await prisma.photoAlbum.findFirst({ where: { id: input.id, userId: ctx.user.id } })
    if (!album) throw new TRPCError({ code: 'NOT_FOUND' })
    await prisma.photoAlbum.delete({ where: { id: input.id } })
    return { ok: true }
  }),

  /** Contenu d'un album (le mien, ou public si celui d'un autre membre). */
  albumPhotos: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const album = await prisma.photoAlbum.findUnique({
      where: { id: input.id },
      include: { photos: { orderBy: { order: 'asc' }, select: { id: true, url: true, createdAt: true } } },
    })
    if (!album || (!album.isPublic && album.userId !== ctx.user?.id)) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }
    return {
      id: album.id,
      name: album.name,
      isPublic: album.isPublic,
      mine: album.userId === ctx.user?.id,
      photos: album.photos,
    }
  }),

  /** Ajouter une photo (URL déjà téléversée) à un album personnel. */
  addPhotoToAlbum: protectedProcedure
    .input(z.object({ albumId: z.string(), url: z.string().url().max(600) }))
    .mutation(async ({ input, ctx }) => {
      const album = await prisma.photoAlbum.findFirst({
        where: { id: input.albumId, userId: ctx.user.id },
      })
      if (!album) throw new TRPCError({ code: 'NOT_FOUND' })
      const last = await prisma.profilePhoto.findFirst({
        where: { userId: ctx.user.id },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      const photo = await prisma.profilePhoto.create({
        data: {
          userId: ctx.user.id,
          url: input.url,
          albumId: album.id,
          order: (last?.order ?? 0) + 1,
        },
        select: { id: true, url: true, albumId: true },
      })
      if (!album.coverUrl) {
        await prisma.photoAlbum.update({ where: { id: album.id }, data: { coverUrl: input.url } })
      }
      return photo
    }),

  /** Déplacer une photo vers un autre album (null = hors album). */
  movePhoto: protectedProcedure
    .input(z.object({ photoId: z.string(), albumId: z.string().nullable() }))
    .mutation(async ({ input, ctx }) => {
      const photo = await prisma.profilePhoto.findFirst({
        where: { id: input.photoId, userId: ctx.user.id },
      })
      if (!photo) throw new TRPCError({ code: 'NOT_FOUND' })
      if (input.albumId) {
        const album = await prisma.photoAlbum.findFirst({
          where: { id: input.albumId, userId: ctx.user.id },
        })
        if (!album) throw new TRPCError({ code: 'NOT_FOUND' })
      }
      await prisma.profilePhoto.update({
        where: { id: input.photoId },
        data: { albumId: input.albumId },
      })
      return { ok: true }
    }),

  /** Albums publics d'un membre (vue profil). */
  memberAlbums: publicProcedure.input(z.object({ userId: z.string() })).query(async ({ input }) => {
    const albums = await prisma.photoAlbum.findMany({
      where: { userId: input.userId, isPublic: true },
      orderBy: { createdAt: 'desc' },
      include: { photos: { orderBy: { order: 'asc' }, select: { id: true, url: true } } },
    })
    return albums.map((a) => ({
      id: a.id,
      name: a.name,
      count: a.photos.length,
      coverUrl: a.coverUrl ?? a.photos[0]?.url ?? null,
      createdAt: a.createdAt,
    }))
  }),

})
