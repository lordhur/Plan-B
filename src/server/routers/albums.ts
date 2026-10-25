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
})
