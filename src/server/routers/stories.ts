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
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { author: { select: AUTHOR_SELECT } },
    })

    // Regroupement par auteur (moi en premier)
    const byAuthor = new Map<
      string,
      {
        author: {
          id: string
          firstName: string
          lastName: string
          displayName: string | null
          avatarUrl: string | null
        }
        isMe: boolean
        items: {
          id: string
          mediaUrl: string
          type: 'PHOTO' | 'VIDEO'
          caption: string | null
          createdAt: Date
        }[]
      }
    >()
    for (const s of stories) {
      const entry =
        byAuthor.get(s.authorId) ??
        (() => {
          const e = {
            author: s.author,
            isMe: s.authorId === ctx.user.id,
            items: [] as {
              id: string
              mediaUrl: string
              type: 'PHOTO' | 'VIDEO'
              caption: string | null
              createdAt: Date
            }[],
          }
          byAuthor.set(s.authorId, e)
          return e
        })()
      entry.items.push({
        id: s.id,
        mediaUrl: s.mediaUrl,
        type: s.type,
        caption: s.caption,
        createdAt: s.createdAt,
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
})
