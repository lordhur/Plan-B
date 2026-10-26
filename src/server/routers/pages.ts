import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { prisma } from '../db'
import { notify } from '../notifications'
import { createTRPCRouter, publicProcedure, verifiedProcedure } from '../trpc'

const PAGE_CATEGORIES = ['commerce', 'association', 'salle', 'restaurant', 'sport', 'culture', 'autre'] as const

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
}

/** Pages organisateurs/commerces (spec Phase 5 §5.1). */
export const pagesRouter = createTRPCRouter({
  /** Annuaire des pages (+ recherche). */
  list: publicProcedure
    .input(z.object({ search: z.string().trim().max(60).optional() }).nullish())
    .query(async ({ input }) =>
      prisma.page.findMany({
        where: input?.search
          ? {
              OR: [
                { name: { contains: input.search, mode: 'insensitive' } },
                { description: { contains: input.search, mode: 'insensitive' } },
                { city: { contains: input.search, mode: 'insensitive' } },
              ],
            }
          : undefined,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          category: true,
          avatarUrl: true,
          coverUrl: true,
          city: true,
          isVerified: true,
          followerCount: true,
          _count: { select: { events: true } },
        },
        orderBy: [{ followerCount: 'desc' }, { name: 'asc' }],
        take: 60,
      }),
    ),

  /** Détail d'une page (+ mon suivi). */
  bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input, ctx }) => {
    const page = await prisma.page.findUnique({
      where: { slug: input.slug },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        events: {
          where: { status: { in: ['UPCOMING', 'ONGOING'] } },
          orderBy: { startDate: 'asc' },
          take: 10,
          select: {
            id: true,
            slug: true,
            title: true,
            startDate: true,
            city: true,
            price: true,
            currentParticipants: true,
            category: { select: { name: true, icon: true, color: true } },
          },
        },
      },
    })
    if (!page) throw new TRPCError({ code: 'NOT_FOUND', message: 'Page introuvable' })

    let following = false
    if (ctx.user) {
      const f = await prisma.pageFollow.findUnique({
        where: { pageId_userId: { pageId: page.id, userId: ctx.user.id } },
        select: { id: true },
      })
      following = !!f
    }
    return { ...page, following, isOwner: ctx.user?.id === page.ownerId }
  }),

  /** Créer une page (compte vérifié requis). */
  create: verifiedProcedure
    .input(
      z.object({
        name: z.string().trim().min(3).max(80),
        description: z.string().trim().max(2000).optional(),
        category: z.enum(PAGE_CATEGORIES),
        city: z.string().trim().max(80).optional(),
        address: z.string().trim().max(160).optional(),
        phone: z.string().trim().max(20).optional(),
        website: z.string().url().optional(),
        email: z.string().email().optional(),
        coverUrl: z
          .string()
          .trim()
          .max(2048)
          .refine((v) => v.startsWith('/') || /^https?:\/\//i.test(v), 'URL d’image invalide')
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const base = slugify(input.name) || 'page'
      let slug = base
      let n = 1
      while (await prisma.page.findUnique({ where: { slug }, select: { id: true } })) {
        slug = `${base}-${++n}`
      }
      return prisma.page.create({
        data: {
          ownerId: ctx.user.id,
          name: input.name,
          slug,
          description: input.description,
          category: input.category,
          city: input.city,
          address: input.address,
          phone: input.phone,
          website: input.website,
          email: input.email,
          coverUrl: input.coverUrl,
        },
        select: { id: true, slug: true, name: true },
      })
    }),

  /** Modifier ma page. */
  update: verifiedProcedure
    .input(
      z.object({
        pageId: z.string(),
        name: z.string().trim().min(3).max(80).optional(),
        description: z.string().trim().max(2000).nullable().optional(),
        city: z.string().trim().max(80).nullable().optional(),
        address: z.string().trim().max(160).nullable().optional(),
        phone: z.string().trim().max(20).nullable().optional(),
        website: z.string().url().nullable().optional(),
        email: z.string().email().nullable().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const page = await prisma.page.findUnique({ where: { id: input.pageId }, select: { ownerId: true } })
      if (!page) throw new TRPCError({ code: 'NOT_FOUND', message: 'Page introuvable' })
      if (page.ownerId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé au propriétaire' })
      const { pageId, ...data } = input
      return prisma.page.update({ where: { id: pageId }, data })
    }),

  /** Mes pages. */
  mine: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return []
    return prisma.page.findMany({
      where: { ownerId: ctx.user.id },
      select: { id: true, name: true, slug: true, category: true, followerCount: true, isVerified: true },
      orderBy: { createdAt: 'desc' },
    })
  }),

  /** Suivre / ne plus suivre. */
  toggleFollow: publicProcedure.input(z.object({ pageId: z.string() })).mutation(async ({ input, ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' })
    const page = await prisma.page.findUnique({ where: { id: input.pageId }, select: { id: true } })
    if (!page) throw new TRPCError({ code: 'NOT_FOUND', message: 'Page introuvable' })

    const existing = await prisma.pageFollow.findUnique({
      where: { pageId_userId: { pageId: input.pageId, userId: ctx.user.id } },
    })
    if (existing) {
      await prisma.$transaction([
        prisma.pageFollow.delete({ where: { id: existing.id } }),
        prisma.page.update({ where: { id: input.pageId }, data: { followerCount: { decrement: 1 } } }),
      ])
      return { following: false }
    }
    await prisma.$transaction([
      prisma.pageFollow.create({ data: { pageId: input.pageId, userId: ctx.user.id } }),
      prisma.page.update({ where: { id: input.pageId }, data: { followerCount: { increment: 1 } } }),
    ])
    return { following: true }
  }),

  /** Notifie les abonnés quand une page publie un plan (appelé par events.create). */
})

/** Alerte les abonnés d'une page après publication d'un plan. */
export async function notifyPageFollowers(pageId: string, eventSlug: string, eventTitle: string): Promise<void> {
  const followers = await prisma.pageFollow.findMany({
    where: { pageId },
    select: { userId: true },
    take: 200,
  })
  const page = await prisma.page.findUnique({ where: { id: pageId }, select: { name: true } })
  for (const f of followers) {
    await notify(f.userId, 'PAGE_NEW_EVENT', `${page?.name ?? 'Une page suivie'} publie un plan 📣`, eventTitle, {
      link: `/events/${eventSlug}`,
    })
  }
}
