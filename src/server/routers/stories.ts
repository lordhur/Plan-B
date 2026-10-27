import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { prisma } from '../db'
import { createTRPCRouter, protectedProcedure } from '../trpc'

const AUTHOR_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  displayName: true,
  avatarUrl: true,
} as const

/** Stories — photos/vidéos éphémères (24 h) de moi et de mes amis. */
export const storiesRouter = createTRPCRouter({
  /** Fil des stories actives (24 dernières heures) : moi + mes amis, groupées par auteur. */
  feed: protectedProcedure.query(async ({ ctx }) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Mes amis (demandes acceptées dans les deux sens)
    const friendships = await prisma.friendRequest.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ senderId: ctx.user.id }, { receiverId: ctx.user.id }],
      },
      select: { senderId: true, receiverId: true },
    })
    const friendIds = friendships.map((f) =>
      f.senderId === ctx.user.id ? f.receiverId : f.senderId,
    )

    const stories = await prisma.story.findMany({
      where: {
        createdAt: { gte: since },
        authorId: { in: [ctx.user.id, ...friendIds] },
      },
      orderBy: { createdAt: 'asc' },
      take: 150,
      include: {
        author: { select: AUTHOR_SELECT },
        _count: { select: { likes: true } },
        likes: { where: { userId: ctx.user.id }, select: { id: true } },
      },
    })

    type Item = {
      id: string
      mediaUrl: string
      type: 'PHOTO' | 'VIDEO'
      caption: string | null
      createdAt: Date
      likes: number
      likedByMe: boolean
    }
    type Author = {
      id: string
      firstName: string
      lastName: string
      displayName: string | null
      avatarUrl: string | null
    }

    // Regroupement par auteur (moi en premier)
    const byAuthor = new Map<string, { author: Author; isMe: boolean; items: Item[] }>()
    for (const s of stories) {
      let entry = byAuthor.get(s.authorId)
      if (!entry) {
        entry = { author: s.author, isMe: s.authorId === ctx.user.id, items: [] }
        byAuthor.set(s.authorId, entry)
      }
      entry.items.push({
        id: s.id,
        mediaUrl: s.mediaUrl,
        type: s.type,
        caption: s.caption,
        createdAt: s.createdAt,
        likes: s._count.likes,
        likedByMe: s.likes.length > 0,
      })
    }

    return [...byAuthor.values()].sort((a, b) => Number(b.isMe) - Number(a.isMe))
  }),

  /** Publier une story (média déjà téléversé sur le stockage). */
  create: protectedProcedure
    .input(
      z.object({
        mediaUrl: z
          .string()
          .refine(
            (v) =>
              v.startsWith('/api/img/') ||
              v.startsWith('https://kwnqvyjrynlgokdcqmwi.supabase.co/storage/'),
            'URL de média non autorisée',
          ),
        type: z.enum(['PHOTO', 'VIDEO']),
        caption: z.string().trim().max(200).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return prisma.story.create({
        data: {
          authorId: ctx.user.id,
          mediaUrl: input.mediaUrl,
          type: input.type,
          caption: input.caption || null,
        },
        include: { author: { select: AUTHOR_SELECT } },
      })
    }),

  /** Supprimer une de mes stories. */
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const story = await prisma.story.findFirst({
        where: { id: input.id, authorId: ctx.user.id },
      })
      if (!story) return { ok: true as const }
      await prisma.story.delete({ where: { id: story.id } })
      return { ok: true as const }
    }),
  // ------------------------------------------------------------------
  // Stories mémorisées — « album stories » du profil (spec)
  // ------------------------------------------------------------------

  /** Mémoriser une story vue (pour la retrouver dans mon album stories). */
  saveStory: protectedProcedure
    .input(z.object({ storyId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const story = await prisma.story.findUnique({
        where: { id: input.storyId },
        select: { id: true, authorId: true },
      })
      if (!story) throw new TRPCError({ code: 'NOT_FOUND', message: 'Story introuvable' })
      // Spec : on ne mémorise que SES propres stories ; celles des autres se likent.
      if (story.authorId !== ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Vous pouvez seulement mémoriser vos propres stories — likez celles des autres.',
        })
      }
      const last = await prisma.savedStory.findFirst({
        where: { userId: ctx.user.id },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      await prisma.savedStory.upsert({
        where: { userId_storyId: { userId: ctx.user.id, storyId: input.storyId } },
        create: { userId: ctx.user.id, storyId: input.storyId, order: (last?.order ?? 0) + 1 },
        update: {},
      })
      return { ok: true as const }
    }),

  /** Retirer une story de mon album. */
  unsaveStory: protectedProcedure
    .input(z.object({ storyId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await prisma.savedStory.deleteMany({ where: { userId: ctx.user.id, storyId: input.storyId } })
      return { ok: true as const }
    }),

  /** Mon album stories : les stories mémorisées, dans mon ordre. */
  mySavedStories: protectedProcedure.query(async ({ ctx }) => {
    const saved = await prisma.savedStory.findMany({
      where: { userId: ctx.user.id },
      orderBy: { order: 'asc' },
      include: {
        story: { include: { author: { select: { id: true, firstName: true, lastName: true, displayName: true, avatarUrl: true } } } },
      },
    })
    return saved.map((s) => ({
      id: s.id,
      order: s.order,
      story: {
        id: s.story.id,
        mediaUrl: s.story.mediaUrl,
        type: s.story.type,
        caption: s.story.caption,
        createdAt: s.story.createdAt,
        author: s.story.author,
      },
    }))
  }),

  // ------------------------------------------------------------------
  // « J'aime » sur les stories des autres (spec)
  // ------------------------------------------------------------------

  /** Aimer la story d'un autre membre (idempotent). */
  likeStory: protectedProcedure
    .input(z.object({ storyId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const story = await prisma.story.findUnique({
        where: { id: input.storyId },
        select: { id: true, authorId: true },
      })
      if (!story) throw new TRPCError({ code: 'NOT_FOUND', message: 'Story introuvable' })
      if (story.authorId === ctx.user.id) {
        return { ok: true as const, likes: await prisma.storyLike.count({ where: { storyId: story.id } }) }
      }
      await prisma.storyLike.upsert({
        where: { storyId_userId: { storyId: story.id, userId: ctx.user.id } },
        create: { storyId: story.id, userId: ctx.user.id },
        update: {},
      })
      return { ok: true as const, likes: await prisma.storyLike.count({ where: { storyId: story.id } }) }
    }),

  /** Retirer mon « j'aime » d'une story. */
  unlikeStory: protectedProcedure
    .input(z.object({ storyId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await prisma.storyLike.deleteMany({ where: { storyId: input.storyId, userId: ctx.user.id } })
      return { ok: true as const, likes: await prisma.storyLike.count({ where: { storyId: input.storyId } }) }
    }),

  /** Déplacer une story mémorisée dans l'album (haut/bas). */
  reorderSavedStory: protectedProcedure
    .input(z.object({ id: z.string(), direction: z.enum(['up', 'down']) }))
    .mutation(async ({ input, ctx }) => {
      const rows = await prisma.savedStory.findMany({
        where: { userId: ctx.user.id },
        orderBy: { order: 'asc' },
        select: { id: true, order: true },
      })
      const i = rows.findIndex((r) => r.id === input.id)
      const j = input.direction === 'up' ? i - 1 : i + 1
      if (i < 0 || j < 0 || j >= rows.length) return { ok: true as const }
      const a = rows[i]!
      const b = rows[j]!
      await prisma.$transaction([
        prisma.savedStory.update({ where: { id: a.id }, data: { order: b.order } }),
        prisma.savedStory.update({ where: { id: b.id }, data: { order: a.order } }),
      ])
      return { ok: true as const }
    }),

})
