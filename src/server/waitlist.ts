import { prisma } from './db'
import { notify } from './notifications'

/**
 * Promotion automatique de la liste d'attente :
 * le premier en attente devient participant et reçoit une notification.
 * Utilisé par le désistement (temps réel) et par le cron promote-waitlist.
 */
export async function promoteFromWaitlist(eventId: string): Promise<boolean> {
  const next = await prisma.waitlistEntry.findFirst({
    where: { eventId },
    orderBy: { position: 'asc' },
    include: { event: true },
  })
  if (!next) return false

  const event = next.event
  const isFull = event.maxParticipants != null && event.currentParticipants >= event.maxParticipants
  if (isFull) return false

  await prisma.$transaction([
    prisma.waitlistEntry.delete({ where: { id: next.id } }),
    prisma.eventParticipation.create({
      data: { eventId, userId: next.userId, status: 'CONFIRMED' },
    }),
    prisma.event.update({
      where: { id: eventId },
      data: { currentParticipants: { increment: 1 } },
    }),
  ])

  await notify(next.userId, 'WAITLIST_PROMOTED', 'Place libérée ! 🎉', `Vous participez à « ${event.title} »`, {
    link: `/events/${event.slug}`,
    data: { eventId },
  })
  return true
}

/**
 * Passe tous les événements dont les listes d'attente peuvent avancer
 * (ex. après annulation partielle, bug, etc.). Retourne le nombre de promotions.
 */
export async function promoteAllPendingWaitlists(): Promise<number> {
  const events = await prisma.event.findMany({
    where: {
      status: { in: ['UPCOMING', 'ONGOING'] },
      waitlist: { some: {} },
    },
    select: { id: true },
  })
  let promoted = 0
  for (const e of events) {
    // Boucle : plusieurs places peuvent s'être libérées
    while (await promoteFromWaitlist(e.id)) promoted++
  }
  return promoted
}
