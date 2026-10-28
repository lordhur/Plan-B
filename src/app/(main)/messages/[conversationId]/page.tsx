'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { use, useMemo } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ChatThread } from '@/components/messages/ChatThread'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

/** Conversation privée 1-1 (spec Phase 2 §1.2). */
export default function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params)
  const { user, isAuthenticated, isLoading: loadingMe } = useCurrentUser()

  const meta = trpc.messages.messages.useQuery(
    { conversationId, limit: 1 },
    { enabled: isAuthenticated, refetchInterval: false },
  )

  const other = useMemo(() => {
    const members = meta.data?.members ?? []
    return members.find((m) => m.id !== user?.id) ?? null
  }, [meta.data, user?.id])

  const avatarUrl = meta.data?.avatarUrl ?? other?.avatarUrl ?? null
  const title = meta.data?.name ?? (other ? `${other.firstName} ${other.lastName}` : 'Conversation')

  if (loadingMe) return <LoadingSpinner label="Chargement" />

  const name = title

  return (
    <div className="chat-shell mx-auto w-full max-w-2xl px-3 sm:px-4 md:px-0">
      <header className="flex items-center gap-3 border-b border-border py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Retour aux messages">
          <Link href="/messages">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <Avatar src={avatarUrl} name={name} className="h-9 w-9" />
          {other ? (
            <Link href={`/u/${other.id}`} className="font-semibold hover:underline">
              {name}
            </Link>
          ) : (
            <span className="font-semibold">{name}</span>
          )}
        </div>
      </header>
      <ChatThread kind="dm" id={conversationId} />
    </div>
  )
}
