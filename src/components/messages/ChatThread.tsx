'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Download,
  FileText,
  Loader2,
  Paperclip,
  Send,
  Smile,
  X,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmojiPicker } from './EmojiPicker'
import { uploadToStorage } from '@/lib/supabaseUpload'
import { useLang } from '@/lib/i18n'
import { useTranslate } from '@/lib/translate'
import { Timer, Languages } from 'lucide-react'
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
  mediaUrl?: string | null
  mediaType?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE' | null
  mediaName?: string | null
}

type MediaType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE'

interface PendingAttachment {
  url: string
  type: MediaType
  name: string
  previewUrl?: string
}

interface ChatThreadProps {
  /** 'dm' : messagerie privée (conversationId) · 'event' : chat d'événement (eventId). */
  kind: 'dm' | 'event'
  id: string
  /** Hauteur fixe du fil (par défaut : remplit l'écran sous l'en-tête). */
  className?: string
}

const MAX_ATTACHMENT = 50 * 1024 * 1024 // vidéos/audio/fichiers via Supabase Storage
const MAX_INLINE_IMAGE = 3.5 * 1024 * 1024 // photos légères → compression serveur
const ACCEPT = 'image/*,video/mp4,video/webm,video/quicktime,audio/*,application/pdf'

/** Rendu d'une pièce jointe dans une bulle. */
function AttachmentView({
  type,
  url,
  name,
  mine,
}: {
  type: MediaType
  url: string
  name?: string | null
  mine: boolean
}) {
  if (type === 'IMAGE') {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={name || 'Photo partagée'}
          loading="lazy"
          className="max-h-72 w-full rounded-xl object-cover"
        />
      </a>
    )
  }
  if (type === 'VIDEO') {
    return <video src={url} controls preload="metadata" className="max-h-72 w-full rounded-xl" />
  }
  if (type === 'AUDIO') {
    return <audio src={url} controls preload="metadata" className="w-60 max-w-full" />
  }
  return (
    <a
      href={url}
      download={name || undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-xl px-3 py-2.5 no-underline',
        mine ? 'bg-white/15 hover:bg-white/25' : 'bg-card hover:bg-bg-secondary',
      )}
    >
      <FileText className="h-6 w-6 shrink-0" aria-hidden />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{name || 'Fichier'}</span>
        <span className="flex items-center gap-1 text-xs opacity-80">
          <Download className="h-3 w-3" aria-hidden /> Télécharger
        </span>
      </span>
    </a>
  )
}

/** Texte du message — traduction automatique FR→EN activable. */
function MsgText({ text, translate }: { text: string; translate: boolean }) {
  const out = useTranslate(text, translate)
  return <>{out}</>
}

/**
 * Fil de discussion partagé (DM + chat d'événement).
 * DM : émojis + pièces jointes (photos, vidéos, audio, PDF ≤ 4 Mo).
 * Temps réel pragmatique : polling react-query (3,5 s) — compatible
 * serverless ; à remplacer par WebSocket/Realtime à l'échelle.
 */
export function ChatThread({ kind, id, className }: ChatThreadProps) {
  const { user } = useCurrentUser()
  const [content, setContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pinnedBottom, setPinnedBottom] = useState(true)
  const [showEmoji, setShowEmoji] = useState(false)
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null)
  const [uploading, setUploading] = useState(false)
  const [translateOn, setTranslateOn] = useState(false)
  const { lang } = useLang()
  const utils = trpc.useUtils()
  const setEphemeral = trpc.messages.setEphemeral.useMutation({
    onSuccess: async () => {
      await utils.messages.invalidate()
    },
  })

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
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType,
          mediaName: m.mediaName,
        }))
      : (event.data ?? []).map((m) => ({
          id: m.id,
          content: m.content,
          createdAt: m.createdAt,
          author: m.user,
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType,
          mediaName: null,
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

  /** Insère l'émoji à la position du curseur. */
  const insertEmoji = (emoji: string) => {
    const el = inputRef.current
    if (!el) {
      setContent((c) => c + emoji)
      return
    }
    const start = el.selectionStart ?? content.length
    const end = el.selectionEnd ?? content.length
    const next = content.slice(0, start) + emoji + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + emoji.length, start + emoji.length)
    })
  }

  /**
   * Téléverse une pièce jointe :
   * - photos légères → /api/attachment (compression WebP côté serveur) ;
   * - vidéos, audios et gros fichiers → Supabase Storage (jusqu'à 50 Mo).
   */
  const uploadAttachment = async (file: File) => {
    if (file.size > MAX_ATTACHMENT) {
      toast.error('Fichier trop lourd', 'Limite : 50 Mo.')
      return
    }
    setUploading(true)
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    try {
      // Fichiers volumineux / non-image : stockage direct Supabase
      if (!file.type.startsWith('image/') || file.size > MAX_INLINE_IMAGE) {
        const url = await uploadToStorage(file, 'dm')
        const type: MediaType = file.type.startsWith('video/')
          ? 'VIDEO'
          : file.type.startsWith('audio/')
            ? 'AUDIO'
            : file.type.startsWith('image/')
              ? 'IMAGE'
              : 'FILE'
        setAttachment({ url, type, name: file.name, previewUrl })
        return
      }
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/attachment', { method: 'POST', body: form })
      const json = (await res.json()) as {
        url?: string
        type?: MediaType
        name?: string
        error?: string
      }
      if (!res.ok || !json.url || !json.type) {
        throw new Error(json.error || 'Téléversement impossible')
      }
      setAttachment({ url: json.url, type: json.type, name: json.name ?? file.name, previewUrl })
    } catch (e) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      toast.error(e instanceof Error ? e.message : 'Téléversement impossible')
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = content.trim()
    if ((!text && !attachment) || sending) return
    if (kind === 'dm') {
      const media = attachment
      setContent('')
      setAttachment(null)
      if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl)
      setPinnedBottom(true)
      await sendDm.mutateAsync({
        conversationId: id,
        content: text,
        mediaUrl: media?.url,
        mediaType: media?.type,
        mediaName: media?.name,
      })
      await dm.refetch()
    } else {
      const media = attachment
      if (!text && !media) return
      setContent('')
      setAttachment(null)
      if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl)
      setPinnedBottom(true)
      await sendEvent.mutateAsync({
        eventId: id,
        content: text,
        mediaUrl: media?.url,
        mediaType: media?.type,
      })
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
      {/* Outils : messages éphémères (DM) · traduction auto (chat d'événement) */}
      {kind === 'dm' ? (
        <div className="flex items-center gap-1.5 border-b border-border bg-bg-secondary/60 px-3 py-1.5">
          <Timer className="h-3.5 w-3.5 text-fg-muted" aria-hidden />
          <span className="text-[11px] font-semibold text-fg-muted">Messages éphémères :</span>
          {[
            { v: null, label: 'Non' },
            { v: 24 as const, label: '24 h' },
            { v: 168 as const, label: '1 semaine' },
            { v: 720 as const, label: '1 mois' },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              aria-pressed={(dm.data?.ephemeralHours ?? null) === opt.v}
              onClick={() => setEphemeral.mutate({ conversationId: id, hours: opt.v })}
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors',
                (dm.data?.ephemeralHours ?? null) === opt.v
                  ? 'bg-primary-600 text-white'
                  : 'bg-card text-fg-muted hover:text-fg',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 border-b border-border bg-bg-secondary/60 px-3 py-1.5">
          <button
            type="button"
            aria-pressed={translateOn}
            onClick={() => setTranslateOn((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors',
              translateOn
                ? 'bg-primary-600 text-white'
                : 'bg-card text-fg-muted hover:text-fg',
            )}
          >
            <Languages className="h-3.5 w-3.5" aria-hidden />
            {lang === 'en' ? 'Translate messages' : 'Traduire les messages'}
          </button>
        </div>
      )}

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
          const hasMedia = !!m.mediaUrl && !!m.mediaType
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
                    'rounded-2xl text-sm leading-relaxed',
                    m.content ? 'px-3.5 py-2' : hasMedia ? 'p-1.5' : 'px-3.5 py-2',
                    mine
                      ? 'rounded-br-md bg-primary-600 text-white'
                      : 'rounded-bl-md bg-bg-secondary text-fg',
                  )}
                >
                  {hasMedia && (
                    <div className={cn(m.content && 'mb-1.5')}>
                      <AttachmentView type={m.mediaType!} url={m.mediaUrl!} name={m.mediaName} mine={mine} />
                    </div>
                  )}
                  {m.content && <MsgText text={m.content} translate={translateOn} />}
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

      <form onSubmit={submit} className="sticky bottom-0 border-t border-border bg-bg py-3 safe-bottom">
        {/* Aperçu de la pièce jointe en attente */}
        {attachment && (
          <div className="mb-2 flex items-center gap-3 rounded-2xl border border-border bg-bg-secondary p-2">
            {attachment.type === 'IMAGE' && attachment.previewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={attachment.previewUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-card">
                <FileText className="h-6 w-6 text-fg-muted" aria-hidden />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{attachment.name}</span>
              <span className="text-xs text-fg-muted">Prêt à envoyer</span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl)
                setAttachment(null)
              }}
              aria-label="Retirer la pièce jointe"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fg-muted hover:bg-card hover:text-danger-500"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}

        <div className="relative flex items-end gap-1.5 rounded-3xl border border-border bg-card p-1.5 shadow-sm">
          <>
            {showEmoji && (
              <EmojiPicker onPick={insertEmoji} onClose={() => setShowEmoji(false)} />
            )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Ajouter un émoji"
                aria-expanded={showEmoji}
                onClick={() => setShowEmoji((s) => !s)}
                className="h-11 w-11 shrink-0 rounded-full text-fg-muted hover:text-primary-600"
              >
                <Smile className="h-5 w-5" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Joindre une photo, vidéo ou fichier"
                disabled={uploading || !!attachment}
                onClick={() => fileRef.current?.click()}
                className="h-11 w-11 shrink-0 rounded-full text-fg-muted hover:text-primary-600"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <Paperclip className="h-5 w-5" aria-hidden />
                )}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                className="sr-only-focusable h-1 w-1"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void uploadAttachment(f)
                  e.target.value = ''
                }}
              />
          </>
          <label htmlFor="chat-input" className="sr-only">
            Votre message
          </label>
          <textarea
            ref={inputRef}
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
            className="min-h-11 max-h-32 flex-1 resize-y self-center rounded-2xl border border-transparent bg-bg-secondary px-4 py-2.5 text-sm outline-none transition-shadow focus-visible:border-primary-300 focus-visible:ring-2 focus-visible:ring-primary-500/40"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Envoyer"
            disabled={(!content.trim() && !attachment) || sending}
            className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-tr from-primary-600 to-secondary-500 shadow-md transition-transform hover:scale-105 disabled:hover:scale-100"
          >
            <Send className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </form>
    </div>
  )
}
