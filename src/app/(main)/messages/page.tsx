'use client'

import { MessageCircle, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { formatRelative } from '@/lib/date'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import { useLang } from '@/lib/i18n'

/** Boîte de réception — liste des conversations privées (spec Phase 2 §1.2). */
export default function MessagesPage() {
  const { user, isAuthenticated, isLoading: loadingMe } = useCurrentUser()
  const { t } = useLang()
  const conversations = trpc.messages.conversations.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15_000,
  })
  const [erasing, setErasing] = useState<string | null>(null)
  const erase = trpc.messages.eraseConversation.useMutation({
    onSuccess: () => {
      setErasing(null)
      toast.success('Conversation effacée')
      void conversations.refetch()
    },
  })

  if (loadingMe) return <LoadingSpinner label="Chargement" />
  if (!isAuthenticated) {
    return (
      <div className="py-16 text-center">
        <p className="text-fg-muted">{t('msg_login')}</p>
        <Button asChild className="mt-4">
          <Link href="/login">Se connecter</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-0">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">{t('msg_title')}</h1>
        <p className="text-sm text-fg-muted">{t('msg_subtitle')}</p>
      </header>

      {conversations.isLoading ? (
        <LoadingSpinner label="Chargement des conversations" />
      ) : !conversations.data || conversations.data.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title={t('msg_none')}
          description={t('msg_none_desc')}
          action={
            <Button asChild>
              <Link href="/friends">{t('msg_see_friends')}</Link>
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {conversations.data.map((conv) => {
            const other = conv.members.find((m) => m.user.id !== user?.id)?.user ?? null
            const name =
              conv.name || (other ? `${other.firstName} ${other.lastName}` : 'Conversation')
            // Avatar : photo du groupe (choisie par l'admin) ou photo de l'ami
            const avatarUrl = conv.avatarUrl ?? other?.avatarUrl ?? null
            return (
              <li key={conv.id} className="relative">
                <Link
                  href={`/messages/${conv.id}`}
                  className="flex items-center gap-3 p-4 pr-12 transition-colors hover:bg-bg-secondary"
                >
                  <Avatar src={avatarUrl} name={name} className="h-12 w-12" />
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
                          ? `${conv.lastMessage.sender.id === user?.id ? t('msg_you') : ''}${conv.lastMessage.content}`
                          : t('msg_new')}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white">
                          {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>

                {/* Supprimer la conversation depuis la liste */}
                {erasing === conv.id ? (
                  <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full border border-border bg-card p-1 shadow-lg">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={erase.isPending}
                      onClick={() => erase.mutate({ conversationId: conv.id })}
                    >
                      {t('msg_erase_confirm')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setErasing(null)}>
                      {t('msg_erase_no')}
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setErasing(conv.id)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-fg-muted hover:bg-bg-secondary hover:text-danger-600"
                    aria-label={`${t('msg_erase')} ${name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
