import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { prisma } from '../db'
import { notify } from '../notifications'
import { createTRPCRouter, publicProcedure, protectedProcedure, verifiedProcedure } from '../trpc'

const GROUP_CATEGORIES = ['sport', 'nature', 'culture', 'food', 'jeux', 'voyage', 'parentalité', 'autre'] as const

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
} as const

/** Groupes d'intérêt + forum (spec Phase 5 §5.2). */
export const groupsRouter = createTRPCRouter({
  /** Annuaire des groupes publics (+ recherche). */
  list: publicProcedure
    .input(z.object({ search: z.string().trim().max(60).optional() }).nullish())
    .query(async ({ input }) =>
      prisma.interestGroup.findMany({
        where: {
          isPrivate: false,
          ...(input?.search
            ? {
                OR: [
                  { name: { contains: input.search, mode: 'insensitive' } },
                  { description: { contains: input.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          category: true,
          coverImage: true,
          memberCount: true,
        },
        orderBy: [{ memberCount: 'desc' }, { name: 'asc' }],
        take: 60,
      }),
    ),

  /** Détail d'un groupe : infos + mon rôle + derniers sujets. */
  bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input, ctx }) => {
    const group = await prisma.interestGroup.findUnique({
      where: { slug: input.slug },
      include: {
        forumPosts: {
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
          take: 20,
          include: {
            author: { select: authorSelect },
            _count: { select: { replies: true } },
          },
        },
      },
    })
    if (!group) throw new TRPCError({ code: 'NOT_FOUND', message: 'Groupe introuvable' })

    let myRole: 'ADMIN' | 'MODERATOR' | 'MEMBER' | null = null
    if (ctx.user) {
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId: ctx.user.id } },
        select: { role: true },
      })
      myRole = member?.role ?? null
    }
    if (group.isPrivate && !myRole) {
      // Groupe privé : uniquement joignable via lien direct, contenu masqué
      const { forumPosts, ...rest } = group
      return { ...rest, forumPosts: [], myRole, isPrivateHidden: true as const }
    }
    return { ...group, myRole, isPrivateHidden: false as const }
  }),

  /** Créer un groupe (compte vérifié). Le créateur devient ADMIN. */
  create: verifiedProcedure
    .input(
      z.object({
        name: z.string().trim().min(3).max(80),
        description: z.string().trim().max(2000).optional(),
        category: z.enum(GROUP_CATEGORIES),
        isPrivate: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const base = slugify(input.name) || 'groupe'
      let slug = base
      let n = 1
      while (await prisma.interestGroup.findUnique({ where: { slug }, select: { id: true } })) {
        slug = `${base}-${++n}`
      }
      const group = await prisma.interestGroup.create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          category: input.category,
          isPrivate: input.isPrivate,
          memberCount: 1,
          members: { create: { userId: ctx.user.id, role: 'ADMIN' } },
        },
        select: { id: true, slug: true, name: true },
      })
      return group
    }),

  /** Rejoindre / quitter. */
  toggleJoin: protectedProcedure.input(z.object({ groupId: z.string() })).mutation(async ({ input, ctx }) => {
    const group = await prisma.interestGroup.findUnique({
      where: { id: input.groupId },
      select: { id: true, slug: true },
    })
    if (!group) throw new TRPCError({ code: 'NOT_FOUND', message: 'Groupe introuvable' })

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: input.groupId, userId: ctx.user.id } },
    })
    if (existing) {
      if (existing.role === 'ADMIN') {
        const admins = await prisma.groupMember.count({ where: { groupId: input.groupId, role: 'ADMIN' } })
        if (admins <= 1) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Transférez le rôle d’admin avant de quitter' })
        }
      }
      await prisma.$transaction([
        prisma.groupMember.delete({ where: { id: existing.id } }),
        prisma.interestGroup.update({ where: { id: input.groupId }, data: { memberCount: { decrement: 1 } } }),
      ])
      return { joined: false }
    }
    await prisma.$transaction([
      prisma.groupMember.create({ data: { groupId: input.groupId, userId: ctx.user.id } }),
      prisma.interestGroup.update({ where: { id: input.groupId }, data: { memberCount: { increment: 1 } } }),
    ])
    return { joined: true }
  }),

  /** Sujets du forum (paginé simple). */
  posts: publicProcedure.input(z.object({ groupId: z.string() })).query(async ({ input }) =>
    prisma.forumPost.findMany({
      where: { groupId: input.groupId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      include: { author: { select: authorSelect }, _count: { select: { replies: true } } },
    }),
  ),

  /** Un sujet avec ses réponses. */
  post: publicProcedure.input(z.object({ postId: z.string() })).query(async ({ input }) => {
    const post = await prisma.forumPost.findUnique({
      where: { id: input.postId },
      include: {
        author: { select: authorSelect },
        group: { select: { id: true, slug: true, name: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: authorSelect } },
        },
      },
    })
    if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sujet introuvable' })
    return post
  }),

  /** Créer un sujet (membres uniquement). Les admins/modos sont notifiés. */
  createPost: protectedProcedure
    .input(
      z.object({
        groupId: z.string(),
        title: z.string().trim().min(3).max(140),
        content: z.string().trim().min(1).max(5000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: input.groupId, userId: ctx.user.id } },
        select: { id: true },
      })
      if (!member) throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux membres du groupe' })
      const group = await prisma.interestGroup.findUnique({
        where: { id: input.groupId },
        select: { slug: true },
      })

      const post = await prisma.forumPost.create({
        data: { groupId: input.groupId, authorId: ctx.user.id, title: input.title, content: input.content },
      })

      const staff = await prisma.groupMember.findMany({
        where: { groupId: input.groupId, role: { in: ['ADMIN', 'MODERATOR'] }, userId: { not: ctx.user.id } },
        select: { userId: true },
      })
      for (const s of staff) {
        await notify(s.userId, 'GROUP_NEW_POST', 'Nouveau sujet dans votre groupe', input.title, {
          link: `/groups/${group?.slug}/p/${post.id}`,
        })
      }
      return { id: post.id }
    }),

  /** Répondre à un sujet (membres uniquement). */
  reply: protectedProcedure
    .input(z.object({ postId: z.string(), content: z.string().trim().min(1).max(2000) }))
    .mutation(async ({ input, ctx }) => {
      const post = await prisma.forumPost.findUnique({
        where: { id: input.postId },
        select: { groupId: true },
      })
      if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sujet introuvable' })
      const member = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: post.groupId, userId: ctx.user.id } },
        select: { id: true },
      })
      if (!member) throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux membres du groupe' })

      return prisma.forumReply.create({
        data: { postId: input.postId, authorId: ctx.user.id, content: input.content },
        include: { author: { select: authorSelect } },
      })
    }),

  /** Supprimer un sujet (auteur ou staff du groupe). */
  deletePost: protectedProcedure.input(z.object({ postId: z.string() })).mutation(async ({ input, ctx }) => {
    const post = await prisma.forumPost.findUnique({
      where: { id: input.postId },
      select: { id: true, authorId: true, groupId: true },
    })
    if (!post) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sujet introuvable' })
    if (post.authorId !== ctx.user.id) {
      const staff = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: post.groupId, userId: ctx.user.id } },
        select: { role: true },
      })
      if (!staff || staff.role === 'MEMBER') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé à l’auteur ou à l’équipe du groupe' })
      }
    }
    await prisma.forumPost.delete({ where: { id: post.id } })
    return { ok: true }
  }),
})
