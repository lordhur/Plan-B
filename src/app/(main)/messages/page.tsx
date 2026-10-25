'use client'

import { MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { formatRelative } from '@/lib/date'
import { cn } from '@/lib/utils'

/** Boîte de réception — liste des conversations privées (spec Phase 2 §1.2). */
export default function MessagesPage() {
  const { user, isAuthenticated, isLoading: loadingMe } = useCurrentUser()
  const conversations = trpc.messages.conversations.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15_000,
  })

  if (loadingMe) return <LoadingSpinner label="Chargement" />
  if (!isAuthenticated) {
    return (
      <div className="py-16 text-center">
        <p className="text-fg-muted">Connectez-vous pour voir vos messages.</p>
        <Button asChild className="mt-4">
          <Link href="/login">Se connecter</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-0">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Messages</h1>
        <p className="text-sm text-fg-muted">Vos conversations privées</p>
      </header>

      {conversations.isLoading ? (
        <LoadingSpinner label="Chargement des conversations" />
      ) : !conversations.data || conversations.data.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="Aucune conversation"
          description="Écrivez à vos amis depuis leur profil ou la page Amis."
          action={
            <Button asChild>
              <Link href="/friends">Voir mes amis</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {conversations.data.map((conv) => {
            const other = conv.members.find((m) => m.id !== user?.id) ?? conv.members[0]!
            const name =
              conv.name || (other ? `${other.firstName} ${other.lastName}` : 'Conversation')
            return (
              <li key={conv.id}>
                <Link
                  href={`/messages/${conv.id}`}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-bg-secondary"
                >
                  <Avatar src={other?.avatarUrl} name={name} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn('truncate font-semibold', conv.unreadCount > 0 && 'text-fg')}>
                        {name}
                      </span>
                      {conv.lastMessage && (
                        <span className="shrink-0 text-[11px] text-fg-muted">
                          {formatRelative(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'truncate text-sm text-fg-muted',
                          conv.unreadCount > 0 && 'font-medium text-fg',
                        )}
                      >
                        {conv.lastMessage
                          ? `${conv.lastMessage.sender.id === user?.id ? 'Vous : ' : ''}${conv.lastMessage.content}`
                          : 'Nouvelle conversation'}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
