'use client'

import { MessageCircle, UserPlus, Users } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { FriendButton } from '@/components/friends/FriendButton'
import { formatFullDate } from '@/lib/date'

/** Page « Amis » — liste des amitiés + accès aux demandes (spec Phase 2 §1.1). */
export default function FriendsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: loadingMe } = useCurrentUser()
  const friends = trpc.friends.list.useQuery(undefined, { enabled: isAuthenticated })
  const requests = trpc.friends.receivedRequests.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  })

  if (loadingMe) return <LoadingSpinner label="Chargement" />
  if (!isAuthenticated) {
    return (
      <div className="py-16 text-center">
        <p className="text-fg-muted">Connectez-vous pour retrouver vos amis.</p>
        <Button asChild className="mt-4">
          <Link href="/login">Se connecter</Link>
        </Button>
      </div>
    )
  }

  const startConversation = async (friendId: string) => {
    const res = await fetch('/api/trpc/messages.startWith?batch=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 0: { json: { userId: friendId } } }),
    })
    const data = await res.json()
    const conversationId = data?.[0]?.result?.data?.json?.conversationId as string | undefined
    if (conversationId) router.push(`/messages/${conversationId}`)
    else router.push('/messages')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-0">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Mes amis</h1>
          <p className="text-sm text-fg-muted">
            {friends.data ? `${friends.data.length} ami${friends.data.length > 1 ? 's' : ''}` : '…'}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/friends/requests" className="relative">
            <UserPlus className="h-4 w-4" aria-hidden /> Demandes
            {(requests.data?.length ?? 0) > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white">
                {requests.data!.length}
              </span>
            )}
          </Link>
        </Button>
      </header>

      {friends.isLoading ? (
        <LoadingSpinner label="Chargement des amis" />
      ) : !friends.data || friends.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Pas encore d’amis"
          description="Ajoutez des amis depuis leur profil pour échanger en privé et retrouver leurs plans plus facilement."
          action={
            <Button asChild>
              <Link href="/explore">Explorer les membres</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {friends.data.map(({ friend, since }) => (
            <li key={friend.id} className="flex flex-wrap items-center gap-3 p-4">
              <Link href={`/profile/${friend.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar
                  src={friend.avatarUrl}
                  name={`${friend.firstName} ${friend.lastName}`}
                  size="md"
                />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {friend.displayName || `${friend.firstName} ${friend.lastName}`}
                  </span>
                  <span className="block text-xs text-fg-muted">
                    {friend.city ? `${friend.city} · ` : ''}Amis depuis {formatFullDate(since)}
                  </span>
                </span>
              </Link>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Envoyer un message à ${friend.firstName}`}
                  onClick={() => void startConversation(friend.id)}
                >
                  <MessageCircle className="h-5 w-5" aria-hidden />
                </Button>
                <FriendButton userId={friend.id} size="sm" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {user && (
        <p className="text-center text-xs text-fg-muted">
          💡 Vous pouvez aussi écrire aux participants de vos plans depuis le chat d’événement.
        </p>
      )}
    </div>
  )
}
