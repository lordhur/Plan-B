'use client'

import { UserCheck, UserX } from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/common/BackButton'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { FriendButton } from '@/components/friends/FriendButton'
import { formatRelative } from '@/lib/date'

/** Demandes d'amitié reçues et envoyées (spec Phase 2 §1.1). */
export default function FriendRequestsPage() {
  const { isAuthenticated, isLoading: loadingMe } = useCurrentUser()
  const received = trpc.friends.receivedRequests.useQuery(undefined, { enabled: isAuthenticated })
  const sent = trpc.friends.sentRequests.useQuery(undefined, { enabled: isAuthenticated })

  if (loadingMe) return <LoadingSpinner label="Chargement" />
  if (!isAuthenticated) {
    return (
      <div className="py-16 text-center">
        <p className="text-fg-muted">Connectez-vous pour voir vos demandes.</p>
        <Button asChild className="mt-4">
          <Link href="/login">Se connecter</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8 md:px-0">
      <header className="flex items-center gap-3">
        <BackButton fallback="/friends" label="Retour à l’écran précédent" />
        <h1 className="text-2xl font-extrabold tracking-tight">Demandes d’amis</h1>
      </header>

      <section aria-labelledby="received-title">
        <h2
          id="received-title"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted"
        >
          Reçues ({received.data?.length ?? 0})
        </h2>
        {received.isLoading ? (
          <LoadingSpinner label="Chargement" />
        ) : !received.data || received.data.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="Aucune demande reçue"
            description="Les demandes apparaîtront ici."
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {received.data.map((req) => (
              <li key={req.id} className="flex flex-wrap items-center gap-3 p-4">
                <Link
                  href={`/profile/${req.sender.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <Avatar
                    src={req.sender.avatarUrl}
                    name={`${req.sender.firstName} ${req.sender.lastName}`}
                    size="md"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {req.sender.firstName} {req.sender.lastName}
                    </span>
                    <span className="block text-xs text-fg-muted">
                      il y a {formatRelative(req.createdAt)}
                    </span>
                  </span>
                </Link>
                <FriendButton userId={req.sender.id} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="sent-title">
        <h2
          id="sent-title"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-fg-muted"
        >
          Envoyées ({sent.data?.length ?? 0})
        </h2>
        {sent.isLoading ? (
          <LoadingSpinner label="Chargement" />
        ) : !sent.data || sent.data.length === 0 ? (
          <EmptyState
            icon={UserX}
            title="Aucune demande envoyée"
            description="Trouvez des membres sur la page Explorer."
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {sent.data.map((req) => (
              <li key={req.id} className="flex flex-wrap items-center gap-3 p-4">
                <Link
                  href={`/profile/${req.receiver.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <Avatar
                    src={req.receiver.avatarUrl}
                    name={`${req.receiver.firstName} ${req.receiver.lastName}`}
                    size="md"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {req.receiver.firstName} {req.receiver.lastName}
                    </span>
                    <span className="block text-xs text-fg-muted">
                      En attente · envoyée {formatRelative(req.createdAt)}
                    </span>
                  </span>
                </Link>
                <CancelRequestButton requestId={req.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function CancelRequestButton({ requestId }: { requestId: string }) {
  const utils = trpc.useUtils()
  const cancel = trpc.friends.cancel.useMutation({
    onSuccess: () => {
      void utils.friends.sentRequests.invalidate()
    },
  })
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={cancel.isPending}
      onClick={() => cancel.mutate({ requestId })}
      className="text-fg-muted"
    >
      <UserX className="h-4 w-4" aria-hidden /> Annuler
    </Button>
  )
}
