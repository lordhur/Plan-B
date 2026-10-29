'use client'

import {
  ArrowLeftRight,
  CheckCheck,
  Menu,
  MessageCircle,
  PenSquare,
  Phone,
  Search,
  Settings,
  Trash2,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/toast'
import { useLang } from '@/lib/i18n'
import { useCurrentUser } from '@/lib/session'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

/** Heure du jour, « Hier », puis la date — comme la maquette. */
function conversationTime(value: Date | string): string {
  const d = new Date(value)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const t = d.getTime()
  if (t >= startOfToday) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  if (t >= startOfToday - 24 * 60 * 60 * 1000) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** « en ligne » = signe de vie il y a moins de 5 minutes. */
function isOnline(lastSeenAt: Date | string | null | undefined): boolean {
  if (!lastSeenAt) return false
  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000
}

/** Boîte de réception — présentation de la maquette : cartes arrondies, pastilles. */
export default function MessagesPage() {
  const { user, isAuthenticated, isLoading: loadingMe } = useCurrentUser()
  const { t } = useLang()
  const conversations = trpc.messages.conversations.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 15_000,
  })
  const [erasing, setErasing] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const erase = trpc.messages.eraseConversation.useMutation({
    onSuccess: () => {
      setErasing(null)
      toast.success('Conversation effacée')
      void conversations.refetch()
    },
  })

  const rows = useMemo(() => {
    const list = (conversations.data ?? []).map((conv) => {
      const other = conv.members.find((m) => m.user.id !== user?.id)?.user ?? null
      const name = conv.name || (other ? `${other.firstName} ${other.lastName}` : 'Conversation')
      return {
        conv,
        other,
        name,
        avatarUrl: conv.avatarUrl ?? other?.avatarUrl ?? null,
        online: isOnline(other?.lastSeenAt),
      }
    })
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((r) => r.name.toLowerCase().includes(q))
  }, [conversations.data, user?.id, query])

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

  const myName = user ? user.displayName || `${user.firstName} ${user.lastName}` : 'Moi'

  return (
    <div className="-mt-6 mx-auto max-w-2xl md:mt-0 md:space-y-6 md:py-6">
      {/* En-tête : avatar à anneau dégradé, pseudo, stylo (nouveau message), menu */}
      <header className="flex items-center gap-3 px-4 pb-3 pt-3 md:hidden">
        <span className="shrink-0 rounded-full bg-gradient-to-tr from-accent-500 via-danger-500 to-secondary-600 p-[2.5px]">
          <Avatar
            src={user?.avatarUrl ?? null}
            name={myName}
            className="h-[52px] w-[52px] border-[3px] border-bg"
          />
        </span>
        <h1 className="min-w-0 flex-1 truncate text-[1.6rem] font-extrabold leading-tight tracking-tight">
          {myName}
        </h1>
        <Link
          href="/friends"
          className="flex h-11 w-11 items-center justify-center rounded-full text-fg transition-colors hover:bg-bg-secondary active:scale-95"
          aria-label="Nouveau message"
        >
          <PenSquare className="h-6 w-6" strokeWidth={1.8} aria-hidden />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Menu des messages"
              className="flex h-11 w-11 items-center justify-center rounded-full text-fg transition-colors hover:bg-bg-secondary"
            >
              <Menu className="h-6 w-6" strokeWidth={2.1} aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/friends">
                <PenSquare className="h-4 w-4" aria-hidden /> Nouveau message
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/friends">
                <Users className="h-4 w-4" aria-hidden /> Mes amis
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile/settings">
                <Settings className="h-4 w-4" aria-hidden /> Paramètres
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Version site (desktop) : titre classique */}
      <header className="hidden md:block">
        <h1 className="text-2xl font-extrabold tracking-tight">{t('msg_title')}</h1>
        <p className="text-sm text-fg-muted">{t('msg_subtitle')}</p>
      </header>

      {/* Recherche — pilule grise arrondie */}
      <div className="px-4 pb-4 md:px-0 md:pb-0">
        <label className="flex h-12 items-center gap-2.5 rounded-full bg-bg-secondary px-4">
          <Search className="h-5 w-5 shrink-0 text-fg-muted" aria-hidden />
          <span className="sr-only">Rechercher une conversation</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('msg_search') ?? 'Recherche'}
            className="h-full w-full bg-transparent text-[15px] outline-none placeholder:text-fg-muted"
            type="search"
          />
        </label>
      </div>

      {conversations.isLoading ? (
        <LoadingSpinner label="Chargement des conversations" />
      ) : rows.length === 0 ? (
        <div className="px-4 md:px-0">
          <EmptyState
            icon={MessageCircle}
            title={query ? 'Aucun résultat' : t('msg_none')}
            description={query ? 'Essayez un autre prénom.' : t('msg_none_desc')}
            action={
              !query && (
                <Button asChild>
                  <Link href="/friends">{t('msg_see_friends')}</Link>
                </Button>
              )
            }
          />
        </div>
      ) : (
        <ul className="space-y-2.5 px-3 pb-4 md:space-y-2.5 md:px-0 md:pb-0">
          {rows.map(({ conv, other, name, avatarUrl, online }) => {
            const last = conv.lastMessage
            // Aperçu : appel vocal (audio), GIF, photo, ou texte
            const isCall = last?.mediaType === 'AUDIO'
            const preview = !last
              ? t('msg_new')
              : isCall
                ? 'Appel vocal'
                : last.content
                  ? `${last.sender.id === user?.id ? t('msg_you') : ''}${last.content}`
                  : last.mediaType === 'IMAGE'
                    ? 'Photo'
                    : last.mediaType === 'VIDEO'
                      ? 'Vidéo'
                      : last.mediaType === 'FILE'
                        ? (last.mediaName ?? 'Fichier')
                        : t('msg_new')

            return (
              <li key={conv.id} className="relative">
                <Link
                  href={`/messages/${conv.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-card px-3 py-3 shadow-[0_2px_10px_rgba(15,23,42,0.06)] transition-transform duration-150 active:scale-[0.99] dark:shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
                >
                  {/* Avatar + pastille de non-lu (bleue) + point vert en ligne */}
                  <span className="relative shrink-0">
                    <Avatar
                      src={avatarUrl}
                      name={name}
                      className={cn('h-[58px] w-[58px]', conv.isGroup && 'rounded-2xl')}
                    />
                    {conv.unreadCount > 0 && (
                      <span
                        aria-label={`${conv.unreadCount} message${conv.unreadCount > 1 ? 's' : ''} non lu${conv.unreadCount > 1 ? 's' : ''}`}
                        className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-[#2f8dff] ring-[2.5px] ring-card"
                      />
                    )}
                    {online && (
                      <span
                        aria-label="En ligne"
                        className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#34c759] ring-[2.5px] ring-card"
                      />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          'truncate text-[1.15rem] leading-tight',
                          conv.unreadCount > 0 ? 'font-extrabold' : 'font-bold',
                        )}
                      >
                        {name}
                      </span>
                      {last && (
                        <span className="shrink-0 text-[13px] font-medium text-fg-muted">
                          {conversationTime(last.createdAt)}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-[15px] text-fg-muted">
                      {isCall ? (
                        <Phone className="h-4 w-4 shrink-0 -rotate-0" aria-hidden />
                      ) : conv.unreadCount > 0 || last?.sender.id === user?.id ? (
                        <CheckCheck className="h-4 w-4 shrink-0 text-[#3aa8e0]" aria-hidden />
                      ) : null}
                      <span
                        className={cn('truncate', conv.unreadCount > 0 && 'font-semibold text-fg')}
                      >
                        {preview}
                      </span>
                    </span>
                  </span>
                </Link>

                {/* Menu de conversation (effacer) — cible tactile ≥ 36 px */}
                {erasing === conv.id ? (
                  <div className="absolute inset-x-3 bottom-2 flex items-center justify-end gap-1.5 rounded-xl bg-card/95 p-1.5 shadow-lg ring-1 ring-border">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-9"
                      disabled={erase.isPending}
                      onClick={() => erase.mutate({ conversationId: conv.id })}
                    >
                      {t('msg_erase_confirm')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9"
                      onClick={() => setErasing(null)}
                    >
                      {t('msg_erase_no')}
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setErasing(conv.id)}
                    className="absolute bottom-1.5 right-2 flex h-9 w-9 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-bg-secondary hover:text-danger-600"
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

      {/* Rappel discret côté site */}
      <p className="hidden items-center gap-1.5 text-xs text-fg-muted md:flex">
        <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
        Vos conversations sont privées et chiffrées en transit.
      </p>
    </div>
  )
}
