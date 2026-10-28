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

    // Utilisateurs bloqués (dans un sens ou dans l'autre) — disparaissent de la liste
    const blocks = await prisma.userBlock.findMany({
      where: { OR: [{ blockerId: ctx.user.id }, { blockedId: ctx.user.id }] },
      select: { blockerId: true, blockedId: true },
    })
    const blockedIds = new Set<string>()
    for (const b of blocks) {
      blockedIds.add(b.blockerId === ctx.user.id ? b.blockedId : b.blockerId)
    }

    const result = []
    for (const m of memberships) {
      // Discussion effacée : masquée jusqu'au prochain message
      if (m.hiddenAt && m.conversation.updatedAt <= m.hiddenAt) continue
      const otherUsers = m.conversation.members.filter((mm) => mm.userId !== ctx.user.id)
      if (!m.conversation.isGroup && otherUsers.some((mm) => blockedIds.has(mm.userId))) continue

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
        isMuted: m.isMuted || (m.mutedUntil != null && m.mutedUntil > new Date()),
        theme: m.conversation.theme,
        avatarUrl: m.conversation.avatarUrl,
        myRole: m.role,
        members: m.conversation.members.map((mm) => ({ user: mm.user, role: mm.role })),
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

      // Messages éphémères : fenêtre glissante + purge opportuniste
      const eph = membership.conversation.ephemeralHours
      const cutoff = eph ? new Date(Date.now() - eph * 60 * 60 * 1000) : null
      if (cutoff) {
        prisma.directMessage
          .deleteMany({ where: { conversationId: input.conversationId, createdAt: { lt: cutoff } } })
          .catch(() => undefined)
      }

      const [messages] = await Promise.all([
        prisma.directMessage.findMany({
          where: {
            conversationId: input.conversationId,
            isDeleted: false,
            hiddenFor: { none: { userId: ctx.user.id } },
            ...(cutoff ? { createdAt: { gte: cutoff } } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: input.limit,
          include: { sender: { select: memberUserSelect } },
        }),
        prisma.conversationMember.update({
          where: { id: membership.id },
          data: { lastReadAt: new Date(), deliveredAt: new Date() },
        }),
      ])

      // Accusés de réception pour MES messages : reçu (✓✓ noirs) / lu (✓✓ verts)
      const others = membership.conversation.members.filter((m) => m.userId !== ctx.user.id)
      const otherDeliveredAt = others.length
        ? new Date(Math.min(...others.map((m) => (m.deliveredAt ?? new Date(0)).getTime())))
        : null
      const otherReadAt = others.length
        ? new Date(Math.min(...others.map((m) => m.lastReadAt.getTime())))
        : null

      return {
        messages: messages.reverse(),
        members: membership.conversation.members.map((m) => m.user),
        memberRoles: membership.conversation.members.map((m) => ({ userId: m.userId, role: m.role })),
        isGroup: membership.conversation.isGroup,
        name: membership.conversation.name,
        avatarUrl: membership.conversation.avatarUrl,
        theme: membership.conversation.theme,
        ephemeralHours: eph,
        otherDeliveredAt,
        otherReadAt,
        myRole: membership.role,
      }
    }),

  /** Activer/désactiver les messages éphémères d'une conversation (24 h, semaine, mois). */
  setEphemeral: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        hours: z.union([z.literal(24), z.literal(168), z.literal(720)]).nullable(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: input.conversationId, userId: ctx.user.id } },
      })
      if (!membership) throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' })
      await prisma.conversation.update({
        where: { id: input.conversationId },
        data: { ephemeralHours: input.hours },
      })
      // Purge immédiate si activation
      if (input.hours) {
        const cutoff = new Date(Date.now() - input.hours * 60 * 60 * 1000)
        await prisma.directMessage.deleteMany({
          where: { conversationId: input.conversationId, createdAt: { lt: cutoff } },
        })
      }
      return { ok: true as const, ephemeralHours: input.hours }
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
                v.startsWith('https://kwnqvyjrynlgokdcqmwi.supabase.co/storage/') ||
                /^https:\/\/([a-z0-9-]+\.)*giphy\.com\//.test(v) ||
                /^https:\/\/([a-z0-9-]+\.)*tenor\.com\//.test(v),
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

      // Blocage : impossible d'écrire si l'un des membres m'a bloqué ou est bloqué
      const blockCount = await prisma.userBlock.count({
        where: {
          OR: [
            { blockerId: ctx.user.id, blockedId: { in: others } },
            { blockerId: { in: others }, blockedId: ctx.user.id },
          ],
        },
      })
      if (blockCount > 0) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Message impossible (blocage actif)' })
      }

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
          select: { lastReadAt: true, isMuted: true, mutedUntil: true },
        })
        if (!otherMembership || otherMembership.isMuted) continue
        if (otherMembership.mutedUntil && otherMembership.mutedUntil > new Date()) continue
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

  /** Mode silencieux : 8 h, 1 jour, 1 semaine, toujours, ou annulation. */
  setMute: protectedProcedure
    .input(z.object({ conversationId: z.string(), hours: z.number().int().positive().max(87600).nullable() }))
    .mutation(async ({ input, ctx }) => {
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: input.conversationId, userId: ctx.user.id } },
      })
      if (!membership) throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' })
      await prisma.conversationMember.update({
        where: { id: membership.id },
        data: {
          mutedUntil: input.hours ? new Date(Date.now() + input.hours * 60 * 60 * 1000) : null,
        },
      })
      return { ok: true as const }
    }),

  /** Thème de la discussion. */
  setTheme: protectedProcedure
    .input(z.object({ conversationId: z.string(), theme: z.string().max(30).nullable() }))
    .mutation(async ({ input, ctx }) => {
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: input.conversationId, userId: ctx.user.id } },
      })
      if (!membership) throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' })
      await prisma.conversation.update({
        where: { id: input.conversationId },
        data: { theme: input.theme },
      })
      return { ok: true as const, theme: input.theme }
    }),

  /** Masquer un message pour moi uniquement. */
  hideMessage: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const msg = await prisma.directMessage.findUnique({
        where: { id: input.messageId },
        include: { conversation: { select: { members: { select: { userId: true } } } } },
      })
      if (!msg || !msg.conversation.members.some((m) => m.userId === ctx.user.id)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' })
      }
      await prisma.messageHide.upsert({
        where: { messageId_userId: { messageId: input.messageId, userId: ctx.user.id } },
        create: { messageId: input.messageId, userId: ctx.user.id },
        update: {},
      })
      return { ok: true as const }
    }),

  /** Supprimer pour tous : uniquement MES messages, moins d'1 h. */
  deleteForAll: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const msg = await prisma.directMessage.findUnique({ where: { id: input.messageId } })
      if (!msg) throw new TRPCError({ code: 'NOT_FOUND', message: 'Message introuvable' })
      if (msg.senderId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Ce message ne vous appartient pas' })
      }
      const ageMin = (Date.now() - msg.createdAt.getTime()) / 60000
      if (ageMin > 60) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Trop tard : plus d’1 h après l’envoi' })
      }
      await prisma.directMessage.update({ where: { id: msg.id }, data: { isDeleted: true } })
      return { ok: true as const }
    }),

  /** Effacer la discussion de ma liste (réapparaît au prochain message). */
  eraseConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: input.conversationId, userId: ctx.user.id } },
      })
      if (!membership) throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' })
      await prisma.conversationMember.update({
        where: { id: membership.id },
        data: { hiddenAt: new Date() },
      })
      return { ok: true as const }
    }),

  /** Signaler la discussion aux administrateurs du site (avec copie). */
  report: protectedProcedure
    .input(z.object({ conversationId: z.string(), reason: z.string().trim().max(500) }))
    .mutation(async ({ input, ctx }) => {
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: input.conversationId, userId: ctx.user.id } },
        include: { conversation: { include: { members: { include: { user: { select: { id: true, displayName: true, firstName: true, lastName: true } } } } } } },
      })
      if (!membership) throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès refusé' })

      const recent = await prisma.directMessage.findMany({
        where: { conversationId: input.conversationId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { sender: { select: { firstName: true, lastName: true } } },
      })
      const dump = recent
        .reverse()
        .map((m) => `[${m.createdAt.toISOString()}] ${m.sender.firstName} ${m.sender.lastName} : ${(m.content || m.mediaUrl || '').slice(0, 300)}`)
        .join('\n')
      const people = membership.conversation.members
        .map((m) => `${m.user.displayName || m.user.firstName + ' ' + m.user.lastName} (${m.user.id})`)
        .join(', ')

      await prisma.contactMessage.create({
        data: {
          userId: ctx.user.id,
          email: ctx.user.email,
          name: `${ctx.user.firstName} ${ctx.user.lastName}`,
          subject: 'AUTRE',
          message: `SIGNALATION DE DISCUSSION\nConversation : ${input.conversationId}\nMembres : ${people}\nMotif : ${input.reason}\n\n--- Copie des 50 derniers messages ---\n${dump}`,
        },
      })
      return { ok: true as const }
    }),

  /** Photo du groupe (administrateur uniquement). */
  setGroupAvatar: protectedProcedure
    .input(z.object({ conversationId: z.string(), avatarUrl: z.string().url().nullable() }))
    .mutation(async ({ input, ctx }) => {
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: input.conversationId, userId: ctx.user.id } },
      })
      if (!membership || membership.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux administrateurs du groupe' })
      }
      await prisma.conversation.update({
        where: { id: input.conversationId },
        data: { avatarUrl: input.avatarUrl },
      })
      return { ok: true as const }
    }),

  /** Ajouter/retirer un administrateur du groupe (admin uniquement). */
  setAdmin: protectedProcedure
    .input(z.object({ conversationId: z.string(), userId: z.string(), admin: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const membership = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: input.conversationId, userId: ctx.user.id } },
      })
      if (!membership || membership.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Réservé aux administrateurs du groupe' })
      }
      const target = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: input.conversationId, userId: input.userId } },
      })
      if (!target) throw new TRPCError({ code: 'NOT_FOUND', message: 'Membre introuvable' })
      await prisma.conversationMember.update({
        where: { id: target.id },
        data: { role: input.admin ? 'admin' : 'member' },
      })
      return { ok: true as const }
    }),

  /** Bloquer quelqu'un : il disparaît du site pour moi (et moi pour lui). */
  blockUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Impossible de se bloquer soi-même' })
      }
      await prisma.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId: ctx.user.id, blockedId: input.userId } },
        create: { blockerId: ctx.user.id, blockedId: input.userId },
        update: {},
      })
      return { ok: true as const }
    }),

  /** Débloquer quelqu'un. */
  unblockUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await prisma.userBlock.deleteMany({ where: { blockerId: ctx.user.id, blockedId: input.userId } })
      return { ok: true as const }
    }),

  /** Mes blocages actifs. */
  myBlocks: protectedProcedure.query(({ ctx }) =>
    prisma.userBlock.findMany({
      where: { blockerId: ctx.user.id },
      select: { blockedId: true },
    }),
  ),

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
        content: z.string().trim().max(2000).default(''),
        mediaUrl: z
          .string()
          .url()
          .refine(
            (v) =>
              v.startsWith('/api/img/') ||
              v.startsWith('https://kwnqvyjrynlgokdcqmwi.supabase.co/storage/') ||
              // GIF & stickers envoyés depuis Tenor / Giphy
              /^https:\/\/([a-z0-9-]+\.)*giphy\.com\//.test(v) ||
              /^https:\/\/([a-z0-9-]+\.)*tenor\.com\//.test(v),
            'mediaUrl doit pointer vers /api/img/, le stockage PlanB, Tenor ou Giphy',
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
