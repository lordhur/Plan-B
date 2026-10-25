import { prisma } from '@/server/db'
import { promoteAllPendingWaitlists } from '@/server/waitlist'
import { refreshAllTrustScores } from '@/server/trust'
import { awardAllBadges } from '@/server/badges'
import { notify } from '@/server/notifications'

/**
 * Routes CRON (spec Phase 2 §1.6) — appelées par Vercel Cron (vercel.json).
 * Sécurisées par `Authorization: Bearer <CRON_SECRET>` (Vercel l'envoie
 * automatiquement). En développement local, l'auth est désactivée.
 *
 * Jobs :
 *  - update-event-status : UPCOMING → ONGOING → COMPLETED + passage ATTENDED
 *  - promote-waitlist    : promotion sur tous les événements non complets
 *  - send-reminders      : rappels J-1 et H-1 avant le début
 *  - update-badges       : attribution des badges manquants
 *  - update-trust-scores : recalcul des scores de confiance
 *  - cleanup-expired     : purge des codes expirés et messages supprimés
 */

const HOUR = 60 * 60 * 1000

export const dynamic = 'force-dynamic'

function authorized(request: Request): boolean {
  if (process.env.NODE_ENV !== 'production') return true
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization')
  return header === `Bearer ${secret}`
}

export async function GET(request: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!authorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { job } = await params
  const startedAt = Date.now()

  const respond = (result: unknown) =>
    Response.json({
      job,
      ok: true,
      ms: Date.now() - startedAt,
      ...(typeof result === 'object' && result !== null ? result : { result }),
    })

  try {
    switch (job) {
      case 'update-event-status':
        return respond(await updateEventStatus())
      case 'promote-waitlist':
        return respond({ promoted: await promoteAllPendingWaitlists() })
      case 'send-reminders':
        return respond(await sendReminders())
      case 'update-badges':
        return respond(await awardAllBadges())
      case 'update-trust-scores':
        return respond({ updated: await refreshAllTrustScores() })
      case 'cleanup-expired':
        return respond(await cleanupExpired())
      default:
        return Response.json({ error: `Job inconnu : ${job}` }, { status: 404 })
    }
  } catch (error) {
    console.error(`[cron:${job}]`, error)
    return Response.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

/**
 * Transitions de statut (spec §2.5) :
 * - startDate passé → ONGOING
 * - endDate passé → COMPLETED + participants CONFIRMED → ATTENDED
 */
async function updateEventStatus() {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - HOUR)

  const started = await prisma.event.updateMany({
    where: { status: 'UPCOMING', startDate: { lte: now } },
    data: { status: 'ONGOING' },
  })

  const completed = await prisma.event.updateMany({
    where: { status: { in: ['UPCOMING', 'ONGOING'] }, endDate: { lte: now } },
    data: { status: 'COMPLETED' },
  })

  // Événements tout juste terminés (fenêtre de 1h pour éviter de repasser
  // sur tout l'historique à chaque exécution)
  const recentlyCompleted = await prisma.event.findMany({
    where: { status: 'COMPLETED', endDate: { gt: oneHourAgo, lte: now } },
    select: { id: true },
  })

  let attended = 0
  for (const event of recentlyCompleted) {
    const a = await prisma.eventParticipation.updateMany({
      where: { eventId: event.id, status: 'CONFIRMED' },
      data: { status: 'ATTENDED' },
    })
    attended += a.count
  }

  return { started: started.count, completed: completed.count, attended }
}

/**
 * Rappels J-1 et H-1 (spec §1.6 send-reminders).
 * Fenêtres glissantes de ±30 min : le cron tourne toutes les 30 min,
 * chaque événement ne déclenche donc le rappel qu'une seule fois.
 */
async function sendReminders() {
  const now = Date.now()
  let sent = 0
  for (const hours of [24, 1]) {
    const target = now + hours * HOUR
    const events = await prisma.event.findMany({
      where: {
        status: 'UPCOMING',
        startDate: {
          gt: new Date(target - HOUR / 2),
          lte: new Date(target + HOUR / 2),
        },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        participations: {
          where: { status: { in: ['CONFIRMED', 'ATTENDED'] } },
          select: { userId: true },
        },
      },
    })
    for (const event of events) {
      const when = hours === 24 ? 'demain' : 'dans une heure'
      for (const p of event.participations) {
        await notify(p.userId, 'EVENT_REMINDER', `Votre plan commence ${when} ⏰`, `« ${event.title} » — ne l'oubliez pas !`, {
          link: `/events/${event.slug}`,
          data: { eventId: event.id },
        })
        sent++
      }
    }
  }
  return { sent }
}

/** Purge des données expirées (spec §1.6 cleanup-expired). */
async function cleanupExpired() {
  const now = new Date()
  const [codes, messages] = await Promise.all([
    prisma.verificationCode.deleteMany({
      where: { OR: [{ expiresAt: { lt: now } }, { consumedAt: { not: null } }] },
    }),
    prisma.directMessage.deleteMany({
      where: { isDeleted: true, createdAt: { lt: new Date(now.getTime() - 30 * 24 * HOUR) } },
    }),
  ])
  return { verificationCodes: codes.count, deletedMessages: messages.count }
}
