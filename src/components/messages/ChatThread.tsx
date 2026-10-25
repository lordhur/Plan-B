'use client'

import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { formatRelative } from '@/lib/date'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toast'

interface ChatUser {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
}

interface ChatMessage {
  id: string
  content: string
  createdAt: Date
  author: ChatUser
}

interface ChatThreadProps {
  /** 'dm' : messagerie privée (conversationId) · 'event' : chat d'événement (eventId). */
  kind: 'dm' | 'event'
  id: string
  /** Hauteur fixe du fil (par défaut : remplit l'écran sous l'en-tête). */
  className?: string
}

/**
 * Fil de discussion partagé (DM + chat d'événement).
 * Temps réel pragmatique : polling react-query (3,5 s) — compatible
 * serverless ; à remplacer par WebSocket/Realtime à l'échelle.
 */
export function ChatThread({ kind, id, className }: ChatThreadProps) {
  const { user } = useCurrentUser()
  const [content, setContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [pinnedBottom, setPinnedBottom] = useState(true)

  const dm = trpc.messages.messages.useQuery(
    { conversationId: id, limit: 80 },
    { enabled: kind === 'dm', refetchInterval: 3_500 },
  )
  const event = trpc.messages.eventChat.useQuery(
    { eventId: id, limit: 80 },
    { enabled: kind === 'event', refetchInterval: 4_000 },
  )
  const query = kind === 'dm' ? dm : event

  const sendDm = trpc.messages.send.useMutation({
    onError: (e) => toast.error(e.message),
  })
  const sendEvent = trpc.messages.sendEventMessage.useMutation({
    onError: (e) => toast.error(e.message),
  })
  const sending = sendDm.isPending || sendEvent.isPending

  const messages: ChatMessage[] =
    kind === 'dm'
      ? (dm.data?.messages ?? []).map((m) => ({
          id: m.id,
          content: m.content,
          createdAt: m.createdAt,
          author: m.sender,
        }))
      : (event.data ?? []).map((m) => ({
          id: m.id,
          content: m.content,
          createdAt: m.createdAt,
          author: m.user,
        }))

  // Auto-scroll si l'utilisateur est déjà en bas
  useEffect(() => {
    if (pinnedBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, pinnedBottom])

  const onScroll = () => {
    const el = listRef.current
    if (!el) return
    setPinnedBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = content.trim()
    if (!text || sending) return
    setContent('')
    setPinnedBottom(true)
    if (kind === 'dm') {
      await sendDm.mutateAsync({ conversationId: id, content: text })
      await dm.refetch()
    } else {
      await sendEvent.mutateAsync({ eventId: id, content: text })
      await event.refetch()
    }
  }

  if (query.isLoading) return <LoadingSpinner label="Chargement de la discussion" />
  if (query.isError) {
    return (
      <p role="alert" className="rounded-xl bg-danger-50 p-4 text-sm text-danger-700 dark:bg-danger-950 dark:text-danger-300">
        {query.error.message}
      </p>
    )
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div
        ref={listRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-label="Messages"
        className="flex-1 space-y-3 overflow-y-auto px-1 py-4"
      >
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-fg-muted">
            Aucun message pour l’instant — lancez la conversation 👋
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.author.id === user?.id
          const showAuthor =
            !mine && (i === 0 || messages[i - 1]!.author.id !== m.author.id)
          return (
            <div key={m.id} className={cn('flex items-end gap-2', mine && 'flex-row-reverse')}>
              {!mine ? (
                showAuthor ? (
                  <Avatar src={m.author.avatarUrl} name={`${m.author.firstName} ${m.author.lastName}`} size="sm" />
                ) : (
                  <span className="w-8 shrink-0" aria-hidden />
                )
              ) : null}
              <div className={cn('max-w-[78%]', mine && 'items-end')}>
                {!mine && showAuthor && (
                  <p className="mb-0.5 px-1 text-xs font-semibold text-fg-muted">{m.author.firstName}</p>
                )}
                <div
                  className={cn(
                    'rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                    mine
                      ? 'rounded-br-md bg-primary-600 text-white'
                      : 'rounded-bl-md bg-bg-secondary text-fg',
                  )}
                >
                  {m.content}
                </div>
                <p className={cn('mt-0.5 px-1 text-[10px] text-fg-muted', mine && 'text-right')}>
                  {formatRelative(m.createdAt)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="sticky bottom-0 flex items-end gap-2 border-t border-border bg-bg py-3 safe-bottom">
        <label htmlFor="chat-input" className="sr-only">
          Votre message
        </label>
        <textarea
          id="chat-input"
          rows={1}
          value={content}
          maxLength={2000}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void submit(e)
            }
          }}
          placeholder="Écrivez votre message…"
          className="min-h-11 max-h-32 flex-1 resize-y rounded-2xl border border-border bg-bg-secondary px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        />
        <Button type="submit" size="icon" aria-label="Envoyer" disabled={!content.trim() || sending} className="h-11 w-11 shrink-0 rounded-full">
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </form>
    </div>
  )
}
