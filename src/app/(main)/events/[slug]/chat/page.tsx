'use client'

import { ArrowLeft, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { ChatThread } from '@/components/messages/ChatThread'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'

/** Chat d'événement — réservé à l'organisateur et aux participants confirmés. */
export default function EventChatPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { isAuthenticated, isLoading: loadingMe } = useCurrentUser()
  const event = trpc.events.bySlug.useQuery({ slug }, { enabled: !!slug })

  if (loadingMe || event.isLoading) return <LoadingSpinner label="Chargement" />
  if (!event.data) {
    return <EmptyState icon={MessageSquare} title="Événement introuvable" description="Ce plan n’existe pas ou a été supprimé." />
  }

  return (
    <div className="chat-shell mx-auto w-full max-w-2xl px-3 sm:px-4 md:px-0">
      <header className="flex items-center gap-3 border-b border-border py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Retour à l’événement">
          <Link href={`/events/${slug}`}>
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
        </Button>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{event.data.title}</span>
          <span className="block text-xs text-fg-muted">Chat des participants</span>
        </span>
      </header>
      {isAuthenticated && event.data.id ? (
        <ChatThread kind="event" id={event.data.id} />
      ) : (
        <p className="py-10 text-center text-sm text-fg-muted">
          Connectez-vous pour participer à la discussion.
        </p>
      )}
    </div>
  )
}
