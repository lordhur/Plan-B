import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { prisma } from '../db'
import { notify } from '../notifications'
import { createTRPCRouter, protectedProcedure } from '../trpc'

const publicUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  displayName: true,
  avatarUrl: true,
  city: true,
  averageRating: true,
  totalRatings: true,
  friendCount: true,
} as const

/** Les deux utilisateurs sont-ils amis ? */
export async function areFriends(a: string, b: string): Promise<boolean> {
  const [x, y] = a < b ? [a, b] : [b, a]
  const f = await prisma.friendship.findUnique({
    where: { userAId_userBId: { userAId: x!, userBId: y! } },
    select: { id: true },
  })
  return !!f
}

export const friendsRouter = createTRPCRouter({
  /** Mes amis. */
  list: protectedProcedure.query(async ({ ctx }) => {
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ userAId: ctx.user.id }, { userBId: ctx.user.id }] },
      include: {
        userA: { select: publicUserSelect },
        userB: { select: publicUserSelect },
      },
      orderBy: { createdAt: 'desc' },
    })
    return friendships.map((f) => ({
      since: f.createdAt,
      friend: f.userAId === ctx.user.id ? f.userB : f.userA,
    }))
  }),

  /** Demandes reçues (en attente). */
  receivedRequests: protectedProcedure.query(async ({ ctx }) =>
    prisma.friendRequest.findMany({
      where: { receiverId: ctx.user.id, status: 'PENDING' },
      include: { sender: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' },
    }),
  ),

  /** Demandes envoyées (en attente). */
  sentRequests: protectedProcedure.query(async ({ ctx }) =>
    prisma.friendRequest.findMany({
      where: { senderId: ctx.user.id, status: 'PENDING' },
      include: { receiver: { select: publicUserSelect } },
      orderBy: { createdAt: 'desc' },
    }),
  ),

  /** Statut de la relation avec un utilisateur (pour FriendButton). */
  status: protectedProcedure.input(z.object({ userId: z.string() })).query(async ({ input, ctx }) => {
    if (input.userId === ctx.user.id) return { status: 'self' as const }
    if (await areFriends(ctx.user.id, input.userId)) return { status: 'friends' as const }
    const pending = await prisma.friendRequest.findFirst({
      where: {
        status: 'PENDING',
        OR: [
          { senderId: ctx.user.id, receiverId: input.userId },
          { senderId: input.userId, receiverId: ctx.user.id },
        ],
      },
    })
    if (!pending) return { status: 'none' as const, canRequest: true }
    return {
      status: pending.senderId === ctx.user.id ? ('pending_out' as const) : ('pending_in' as const),
      requestId: pending.id,
    }
  }),

  /** Envoyer une demande d'ami. */
  send: protectedProcedure.input(z.object({ userId: z.string() })).mutation(async ({ input, ctx }) => {
    if (input.userId === ctx.user.id) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Vous ne pouvez pas vous ajouter vous-même' })
    }
    const target = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, allowFriendRequests: true, firstName: true },
    })
    if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'Utilisateur introuvable' })
    if (!target.allowFriendRequests) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `${target.firstName} n’accepte pas les demandes` })
    }
    if (await areFriends(ctx.user.id, input.userId)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Vous êtes déjà amis' })
    }

    // Demande en attente dans l'autre sens ? → on l'accepte directement
    const reverse = await prisma.friendRequest.findFirst({
      where: { senderId: input.userId, receiverId: ctx.user.id, status: 'PENDING' },
    })
    if (reverse) {
      return acceptRequest(reverse.id, ctx.user.id)
    }

    const existing = await prisma.friendRequest.findUnique({
      where: { senderId_receiverId: { senderId: ctx.user.id, receiverId: input.userId } },
    })
    if (existing) {
      if (existing.status === 'PENDING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Demande déjà envoyée' })
      }
      await prisma.friendRequest.update({
        where: { id: existing.id },
        data: { status: 'PENDING', message: null },
      })
    } else {
      await prisma.friendRequest.create({
        data: { senderId: ctx.user.id, receiverId: input.userId },
      })
    }

    await notify(input.userId, 'FRIEND_REQUEST', 'Nouvelle demande d’ami 👋', `${ctx.user.firstName} ${ctx.user.lastName} souhaite vous ajouter`, {
      link: '/friends/requests',
      data: { userId: ctx.user.id },
    })
    return { status: 'PENDING' as const }
  }),

  /** Annuler une demande envoyée. */
  cancel: protectedProcedure.input(z.object({ requestId: z.string() })).mutation(async ({ input, ctx }) => {
    const req = await prisma.friendRequest.findUnique({ where: { id: input.requestId } })
    if (!req || req.senderId !== ctx.user.id) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Demande introuvable' })
    }
    await prisma.friendRequest.delete({ where: { id: req.id } })
    return { ok: true }
  }),

  /** Accepter une demande reçue. */
  accept: protectedProcedure.input(z.object({ requestId: z.string() })).mutation(async ({ input, ctx }) => {
    const req = await prisma.friendRequest.findUnique({ where: { id: input.requestId } })
    if (!req || req.receiverId !== ctx.user.id || req.status !== 'PENDING') {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Demande introuvable' })
    }
    return acceptRequest(req.id, ctx.user.id)
  }),

  /** Refuser une demande reçue. */
  decline: protectedProcedure.input(z.object({ requestId: z.string() })).mutation(async ({ input, ctx }) => {
    const req = await prisma.friendRequest.findUnique({ where: { id: input.requestId } })
    if (!req || req.receiverId !== ctx.user.id || req.status !== 'PENDING') {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Demande introuvable' })
    }
    await prisma.friendRequest.update({
      where: { id: req.id },
      data: { status: 'DECLINED' },
    })
    return { ok: true }
  }),

  /** Retirer un ami. */
  remove: protectedProcedure.input(z.object({ userId: z.string() })).mutation(async ({ input, ctx }) => {
    const [a, b] = ctx.user.id < input.userId ? [ctx.user.id, input.userId] : [input.userId, ctx.user.id]
    const f = await prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId: a!, userBId: b! } },
    })
    if (!f) throw new TRPCError({ code: 'NOT_FOUND', message: 'Vous n’êtes pas amis' })
    await prisma.$transaction([
      prisma.friendship.delete({ where: { id: f.id } }),
      prisma.user.update({ where: { id: ctx.user.id }, data: { friendCount: { decrement: 1 } } }),
      prisma.user.update({ where: { id: input.userId }, data: { friendCount: { decrement: 1 } } }),
    ])
    return { ok: true }
  }),
})

/** Logique commune d'acceptation (demande directe ou croisée). */
async function acceptRequest(requestId: string, accepterId: string) {
  const req = await prisma.friendRequest.findUnique({ where: { id: requestId } })
  if (!req) throw new TRPCError({ code: 'NOT_FOUND', message: 'Demande introuvable' })

  const [a, b] = req.senderId < req.receiverId ? [req.senderId, req.receiverId] : [req.receiverId, req.senderId]

  await prisma.$transaction([
    prisma.friendRequest.update({ where: { id: requestId }, data: { status: 'ACCEPTED' } }),
    prisma.friendship.upsert({
      where: { userAId_userBId: { userAId: a!, userBId: b! } },
      update: {},
      create: { userAId: a!, userBId: b! },
    }),
    prisma.user.update({ where: { id: req.senderId }, data: { friendCount: { increment: 1 } } }),
    prisma.user.update({ where: { id: req.receiverId }, data: { friendCount: { increment: 1 } } }),
  ])

  await notify(req.senderId, 'FRIEND_ACCEPTED', 'Demande acceptée 🎉', `Vous êtes maintenant amis`, {
    link: `/profile/${accepterId}`,
  })
  return { status: 'ACCEPTED' as const }
}
