import { prisma } from './db'
import type { NotificationType, Prisma } from '@/generated/prisma/client'

/** Crée une notification in-app (le push web arrive en Phase 2). */
export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  opts?: { link?: string; data?: Record<string, unknown> },
): Promise<void> {
  await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      link: opts?.link,
      data: (opts?.data ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  })
}
