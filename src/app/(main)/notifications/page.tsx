'use client'

import {
  Bell,
  BellOff,
  CalendarClock,
  CheckCheck,
  Info,
  PartyPopper,
  Star,
  UserPlus,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { formatRelative } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<string, LucideIcon> = {
  EVENT_NEW_PARTICIPANT: UserPlus,
  EVENT_PARTICIPANT_LEFT: Users,
  WAITLIST_PROMOTED: PartyPopper,
  PARTICIPATION_APPROVED: CheckCheck,
  PARTICIPATION_DECLINED: BellOff,
  EVENT_REMINDER: CalendarClock,
  EVENT_CANCELLED: BellOff,
  RATING_RECEIVED: Star,
  SYSTEM: Info,
}

/** CENTRE DE NOTIFICATIONS. */
export default function NotificationsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useCurrentUser()
  const utils = trpc.useUtils()
  const { data, isLoading: listLoading } = trpc.notifications.list.useQuery(
    { limit: 40 },
    { enabled: isAuthenticated },
  )

  const markAll = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => void utils.notifications.invalidate(),
  })
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => void utils.notifications.invalidate(),
  })

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login?next=/notifications')
  }, [isLoading, isAuthenticated, router])

  if (isLoading) return <LoadingSpinner className="py-20" />
  if (!isAuthenticated) return null

  const unread = data?.filter((n) => !n.isRead).length ?? 0

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
          <p className="text-sm text-fg-muted">
            {unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est à jour ✓'}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="secondary" size="sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            <CheckCheck className="h-4 w-4" aria-hidden /> Tout lire
          </Button>
        )}
      </div>

      {listLoading ? (
        <LoadingSpinner className="py-16" />
      ) : data && data.length > 0 ? (
        <ul className="space-y-2">
          {data.map((n) => {
            const Icon = TYPE_ICONS[n.type] ?? Bell
            const cardClass = cn(
              'block rounded-2xl border p-4 transition-colors',
              n.isRead
                ? 'border-border bg-card'
                : 'border-primary-500/40 bg-primary-50/60 dark:bg-primary-950/30',
              n.link && 'hover:bg-bg-secondary',
            )
            const inner = (
              <>
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    n.isRead ? 'bg-bg-secondary text-fg-muted' : 'bg-primary-600 text-white',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{n.title}</p>
                  <p className="mt-0.5 text-sm text-fg-muted">{n.body}</p>
                  <p className="mt-1 text-xs text-fg-muted">{formatRelative(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <span aria-label="Non lu" className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary-600" />
                )}
              </>
            )
            return (
              <li key={n.id}>
                {n.link ? (
                  <Link
                    href={n.link}
                    onClick={() => !n.isRead && markRead.mutate({ id: n.id })}
                    className={cn(cardClass, 'flex gap-3')}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    onClick={() => !n.isRead && markRead.mutate({ id: n.id })}
                    className={cn(cardClass, 'flex gap-3')}
                  >
                    {inner}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState
          icon={Bell}
          title="Aucune notification"
          description="Les nouvelles arrivées (participants, places libérées, rappels) apparaîtront ici."
          action={
            <Button asChild>
              <Link href="/">Voir les plans</Link>
            </Button>
          }
        />
      )}
    </div>
  )
}
