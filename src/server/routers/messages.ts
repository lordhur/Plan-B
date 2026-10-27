import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { prisma } from '../db'
import { notify } from '../notifications'
import { areFriends } from './friends'
import { createTRPCRouter, protectedProcedure } from '../trpc'

const memberUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  displayName: true,
  avatarUrl: true,
} as const

/** Vérifie la confidentialité des messages du destinataire (spec allowMessagesFrom). */
async function assertCanMessage(fromId: string, toId: string): Promise<void> {
  const target = await prisma.user.findUnique({
    where: { id: toId },
    select: { allowMessagesFrom: true, firstName: true },
  })
  if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'Utilisateur introuvable' })

  switch (target.allowMessagesFrom) {
    case 'NOBODY':
      throw new TRPCError({ code: 'FORBIDDEN', message: `${target.firstName} n’accepte pas les messages` })
    case 'FRIENDS_ONLY':
      if (!(await areFriends(fromId, toId))) {
        throw new TRPCError({ code: 'FORBIDDEN', message: `${target.firstName} n’accepte que les messages de ses amis` })
      }
      return
    case 'FRIENDS_OF_FRIENDS': {
      if (await areFriends(fromId, toId)) return
      // Ami en commun ?
      const myFriends = await prisma.friendship.findMany({
        where: { OR: [{ userAId: fromId }, { userBId: fromId }] },
        select: { userAId: true, userBId: true },
      })
      const myFriendIds = new Set(myFriends.map((f) => (f.userAId === fromId ? f.userBId : f.userAId)))
      const mutual = await prisma.friendship.count({
        where: {
          OR: [{ userAId: toId }, { userBId: toId }],
          AND: [
            {
              OR: [
                { userAId: { in: [...myFriendIds] } },
                { userBId: { in: [...myFriendIds] } },
              ],
            },
          ],
        },
      })
      if (mutual === 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `${target.firstName} n’accepte que les messages d’amis d’amis`,
        })
      }
      return
    }
    case 'EVERYONE':
      return
  }
}

/** Trouve (ou crée) la conversation 1-1 entre deux utilisateurs. */
async function getOrCreateDirectConversation(a: string, b: string): Promise<string> {
  const existing = await prisma.conversationMember.findFirst({
    where: {
      userId: a,
      conversation: {
        isGroup: false,
        members: { some: { userId: b } },
      },
    },
    select: { conversationId: true },
  })
  if (existing) return existing.conversationId

  const conv = await prisma.conversation.create({
    data: {
      isGroup: false,
      members: { create: [{ userId: a }, { userId: b }] },
    },
  })
  return conv.id
}

export const messagesRouter = createTRPCRouter({
  /** Liste de mes conversations (avec dernier message + non-lus). */
  conversations: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await prisma.conversationMember.findMany({
      where: { userId: ctx.user.id },
      include: {
        conversation: {
          include: {
            members: { include: { user: { select: memberUserSelect } } },
            messages: {
              where: { isDeleted: false },
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { sender: { select: memberUserSelect } },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    })

    const result = []
    for (const m of memberships) {
      const unread = await prisma.directMessage.count({
        where: {
          conversationId: m.conversationId,
          senderId: { not: ctx.user.id },
          isDeleted: false,
          createdAt: { gt: m.lastReadAt },
        },
      })
      result.push({
        id: m.conversationId,
        name: m.conversation.name,
        isGroup: m.conversation.isGroup,
        isMuted: m.isMuted,
        members: m.conversation.members.map((mm) => mm.user),
        lastMessage: m.conversation.messages[0] ?? null,
        unreadCount: unread,
        updatedAt: m.conversation.updatedAt,
      })
    }
    return result
  }),

  /** Total de messages non lus (badge navigation). */
  totalUnread: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await prisma.conversationMember.findMany({
      where: { userId: ctx.user.id, isMuted: false },
      select: { conversationId: true, lastReadAt: true },
    })
    let total = 0
    for (const m of memberships) {
      total += await prisma.directMessage.count({
        where: {
          conversationId: m.conversationId,
          senderId: { not: ctx.user.id },
          isDeleted: false,
          createdAt: { gt: m.lastReadAt },
        },
      })
    }
    return { count: total }
  }),

  /** Ouvrir (ou créer) une conversation avec un utilisateur. */
  startWith: protectedProcedure.input(z.object({ userId: z.string() })).mutation(async ({ input, ctx }) => {
    if (input.userId === ctx.user.id) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Conversation avec vous-même impossible' })
    }
    await assertCanMessage(ctx.user.id, input.userId)
    const id = await getOrCreateDirectConversation(ctx.user.id, input.userId)
    return { conversationId: id }
  }),

  /** Messages d'une conversation (+ marque comme lu). */
  messages: protectedProcedure
    .input(z.object({ conversationId: z.string(), limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ input, ctx }) => {
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: input.conversationId, userId: ctx.user.id } },
        include: { conversation: { include: { members: { include: { user: { select: memberUserSelect } } } } } },
      })
      if (!membership) throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' })

      const [messages] = await Promise.all([
        prisma.directMessage.findMany({
          where: { conversationId: input.conversationId, isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          include: { sender: { select: memberUserSelect } },
        }),
        prisma.conversationMember.update({
          where: { id: membership.id },
          data: { lastReadAt: new Date() },
        }),
      ])

      return {
        messages: messages.reverse(),
        members: membership.conversation.members.map((m) => m.user),
        isGroup: membership.conversation.isGroup,
        name: membership.conversation.name,
      }
    }),

  /** Envoyer un message privé. */
  send: protectedProcedure
    .input(
      z
        .object({
          conversationId: z.string(),
          content: z.string().trim().max(2000).default(''),
          mediaUrl: z
            .string()
            .trim()
            .max(2048)
            .refine(
              (v) =>
                v.startsWith('/api/img/') ||
                v.startsWith('https://kwnqvyjrynlgokdcqmwi.supabase.co/storage/'),
              'URL de média invalide',
            )
            .optional(),
          mediaType: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'FILE']).optional(),
          mediaName: z.string().trim().max(140).optional(),
        })
        .refine((v) => v.content.length > 0 || !!v.mediaUrl, 'Message vide'),
    )
    .mutation(async ({ input, ctx }) => {
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: input.conversationId, userId: ctx.user.id } },
        include: { conversation: { include: { members: { select: { userId: true } } } } },
      })
      if (!membership) throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' })

      const others = membership.conversation.members
        .map((m) => m.userId)
        .filter((id) => id !== ctx.user.id)

      const message = await prisma.directMessage.create({
        data: {
          conversationId: input.conversationId,
          senderId: ctx.user.id,
          receiverId: others.length === 1 ? others[0] : null,
          content: input.content,
          mediaUrl: input.mediaUrl,
          mediaType: input.mediaType,
          mediaName: input.mediaName,
        },
        include: { sender: { select: memberUserSelect } },
      })
      await prisma.conversation.update({
        where: { id: input.conversationId },
        data: { updatedAt: new Date() },
      })

      // Notification : une seule non-lue par conversation (anti-spam)
      for (const otherId of others) {
        const otherMembership = await prisma.conversationMember.findUnique({
          where: { conversationId_userId: { conversationId: input.conversationId, userId: otherId } },
          select: { lastReadAt: true, isMuted: true },
        })
        if (!otherMembership || otherMembership.isMuted) continue
        const pendingUnread = await prisma.directMessage.count({
          where: {
            conversationId: input.conversationId,
            senderId: ctx.user.id,
            createdAt: { gt: otherMembership.lastReadAt },
          },
        })
        if (pendingUnread === 1) {
          const preview = input.content || (input.mediaType === 'IMAGE' ? '📷 Photo' : input.mediaType === 'VIDEO' ? '🎬 Vidéo' : input.mediaType === 'AUDIO' ? '🎵 Audio' : '📎 Pièce jointe')
          await notify(otherId, 'MESSAGE_RECEIVED', `Nouveau message de ${ctx.user.firstName}`, preview.slice(0, 120), {
            link: `/messages/${input.conversationId}`,
          })
        }
      }

      return message
    }),

  // ========================
  // Chat d'événement
  // ========================

  /** Messages du chat d'un événement (participants confirmés + organisateur). */
  eventChat: protectedProcedure
    .input(z.object({ eventId: z.string(), limit: z.number().int().min(1).max(100).default(60) }))
    .query(async ({ input, ctx }) => {
      await assertEventChatAccess(ctx.user.id, input.eventId)
      const messages = await prisma.eventChatMessage.findMany({
        where: { eventId: input.eventId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        include: { user: { select: memberUserSelect } },
      })
      return messages.reverse()
    }),

  /** Poster dans le chat d'un événement. */
  sendEventMessage: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
        content: z.string().trim().max(2000),
        mediaUrl: z
          .string()
          .url()
          .refine(
            (v) =>
              v.startsWith('/api/img/') ||
              v.startsWith('https://kwnqvyjrynlgokdcqmwi.supabase.co/storage/'),
            'mediaUrl doit pointer vers /api/img/ ou le stockage PlanB',
          )
          .optional(),
        mediaType: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'FILE']).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await assertEventChatAccess(ctx.user.id, input.eventId)
      if (!input.content && !input.mediaUrl) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Message vide' })
      }
      return prisma.eventChatMessage.create({
        data: {
          eventId: input.eventId,
          userId: ctx.user.id,
          content: input.content,
          mediaUrl: input.mediaUrl,
          mediaType: input.mediaType,
        },
        include: { user: { select: memberUserSelect } },
      })
    }),
})

/** Le chat d'événement est réservé à l'organisateur et aux participants confirmés. */
async function assertEventChatAccess(userId: string, eventId: string): Promise<void> {
  const [event, participation] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { organizerId: true } }),
    prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { status: true },
    }),
  ])
  if (!event) throw new TRPCError({ code: 'NOT_FOUND', message: 'Événement introuvable' })
  const allowed =
    event.organizerId === userId ||
    (participation && ['CONFIRMED', 'ATTENDED'].includes(participation.status))
  if (!allowed) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Le chat est réservé aux participants' })
  }
}
