'use client'

import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Heart, Plus, Trash2, X } from 'lucide-react'
import * as React from 'react'
import { trpc } from '@/lib/trpc'
import { useLang } from '@/lib/i18n'
import { useCurrentUser } from '@/lib/session'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { uploadToStorage, MAX_STORAGE_FILE } from '@/lib/supabaseUpload'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

type StoryItem = {
  id: string
  mediaUrl: string
  type: 'PHOTO' | 'VIDEO'
  caption: string | null
  createdAt: Date | string
  likes?: number
  likedByMe?: boolean
}

type StoryGroup = {
  author: {
    id: string
    firstName: string
    lastName: string
    displayName: string | null
    avatarUrl: string | null
  }
  isMe: boolean
  items: StoryItem[]
}

/** Barre de stories (24 h) — moi + mes amis, plusieurs stories par personne. */
export function StoryRail() {
  const { t } = useLang()
  const { isAuthenticated } = useCurrentUser()
  const stories = trpc.stories.feed.useQuery(undefined, { enabled: isAuthenticated })
  const [viewFrom, setViewFrom] = React.useState<number | null>(null)
  const [creating, setCreating] = React.useState(false)

  if (!isAuthenticated) return null

  const groups = stories.data ?? []

  return (
    <section aria-label="Stories" className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      {/* Ajouter ma story */}
      <button
        type="button"
        onClick={() => setCreating(true)}
        className="flex w-16 shrink-0 flex-col items-center gap-1"
        aria-label={t('story_add')}
      >
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-primary-400 bg-primary-50 dark:bg-primary-500/10">
          <Plus className="h-6 w-6 text-primary-600" aria-hidden />
        </span>
        <span className="text-[10px] font-semibold text-fg-muted">{t('story_my')}</span>
      </button>

      {groups.map((g, gi) => {
        const name = g.author.displayName || `${g.author.firstName} ${g.author.lastName}`
        return (
          <button
            key={g.author.id}
            type="button"
            onClick={() => setViewFrom(gi)}
            className="relative flex w-16 shrink-0 flex-col items-center gap-1"
            aria-label={`Voir les ${g.items.length} story${g.items.length > 1 ? 's' : ''} de ${name}`}
          >
            <span className="rounded-full bg-gradient-to-tr from-primary-600 to-secondary-500 p-[2.5px]">
              <Avatar
                src={g.author.avatarUrl}
                name={name}
                className="h-[59px] w-[59px] border-2 border-card"
              />
            </span>
            {g.items.length > 1 && (
              <span className="absolute left-10 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[9px] font-bold text-white">
                {g.items.length}
              </span>
            )}
            <span className="w-full truncate text-center text-[10px] font-semibold text-fg-muted">
              {g.isMe ? t('story_my') : g.author.firstName}
            </span>
          </button>
        )
      })}

      {creating && <StoryCreateDialog onClose={() => setCreating(false)} />}
      {viewFrom !== null && groups.length > 0 && (
        <StoryViewer
          groups={groups}
          startGroup={Math.min(viewFrom, groups.length - 1)}
          onClose={() => setViewFrom(null)}
        />
      )}
    </section>
  )
}

/** Dialogue de création : photo ou vidéo + légende. */
export function StoryCreateDialog({ onClose }: { onClose: () => void }) {
  const [file, setFile] = React.useState<File | null>(null)
  const [type, setType] = React.useState<'PHOTO' | 'VIDEO'>('PHOTO')
  const [caption, setCaption] = React.useState('')
  const [uploading, setUploading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const { t } = useLang()
  const utils = trpc.useUtils()
  const create = trpc.stories.create.useMutation({
    onSuccess: () => {
      toast.success('Story publiée ! 📸', 'Visible par vos amis pendant 24 h')
      void utils.stories.feed.invalidate()
      onClose()
    },
    onError: (err) => toast.error(err.message),
  })

  const pick = (t: 'PHOTO' | 'VIDEO') => {
    setType(t)
    setFile(null)
    inputRef.current?.click()
  }

  const publish = async () => {
    if (!file) return
    if (file.size > MAX_STORAGE_FILE) {
      toast.error('Fichier trop lourd (max 50 Mo)')
      return
    }
    setUploading(true)
    try {
      const url = await uploadToStorage(file, 'stories')
      create.mutate({ mediaUrl: url, type, caption: caption.trim() || undefined })
    } catch {
      toast.error("L'envoi du média a échoué")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('story_add')}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t('story_add')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-secondary"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={type === 'PHOTO' ? 'image/*' : 'video/*'}
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <div className="mb-3 flex gap-2">
          <Button variant={type === 'PHOTO' ? 'default' : 'outline'} className="flex-1" onClick={() => pick('PHOTO')}>
            📷 {t('story_photo')}
          </Button>
          <Button variant={type === 'VIDEO' ? 'default' : 'outline'} className="flex-1" onClick={() => pick('VIDEO')}>
            🎬 {t('story_video')}
          </Button>
        </div>

        {file && (
          <p className="mb-3 truncate rounded-lg bg-bg-secondary px-3 py-2 text-xs font-semibold">
            {file.name} · {(file.size / 1024 / 1024).toFixed(1)} Mo
          </p>
        )}

        <Input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={t('story_caption_ph')}
          maxLength={200}
          className="mb-4"
          aria-label="Légende de la story"
        />

        <Button className="w-full" disabled={!file || uploading || create.isPending} onClick={publish}>
          {uploading || create.isPending ? '…' : t('story_publish')}
        </Button>
        <p className="mt-2 text-center text-[11px] text-fg-muted">
          Visible par vos amis pendant 24 h · max 50 Mo · publiez autant de stories que vous voulez
        </p>
      </div>
    </div>
  )
}

/**
 * Visionneuse plein écran — clic sur le média : story suivante de la personne,
 * puis personne suivante (spec). Mes stories : « mémoriser » (album stories) +
 * suppression. Celles des autres : « j'aime » uniquement.
 */
function StoryViewer({
  groups,
  startGroup,
  onClose,
}: {
  groups: StoryGroup[]
  startGroup: number
  onClose: () => void
}) {
  const [gi, setGi] = React.useState(startGroup)
  const [idx, setIdx] = React.useState(0)
  const [progress, setProgress] = React.useState(0)
  const { t } = useLang()
  const utils = trpc.useUtils()

  const group = groups[gi]
  const item = group?.items[idx]
  const total = group?.items.length ?? 0
  const name = group
    ? group.author.displayName || `${group.author.firstName} ${group.author.lastName}`
    : ''

  const remove = trpc.stories.remove.useMutation({
    onSuccess: () => {
      void utils.stories.feed.invalidate()
      onClose()
    },
  })
  const save = trpc.stories.saveStory.useMutation({
    onSuccess: () => toast.success('Story mémorisée', 'Retrouvez-la dans votre album stories'),
  })
  const unsave = trpc.stories.unsaveStory.useMutation({
    onSuccess: () => toast.success('Retirée de votre album stories'),
  })
  const savedList = trpc.stories.mySavedStories.useQuery(undefined, { refetchInterval: false })
  const isSaved = !!item && (savedList.data ?? []).some((s) => s.story.id === item.id)

  // « J'aime » — possible sur les stories des autres (spec)
  const like = trpc.stories.likeStory.useMutation({
    onSuccess: () => void utils.stories.feed.invalidate(),
  })
  const unlike = trpc.stories.unlikeStory.useMutation({
    onSuccess: () => void utils.stories.feed.invalidate(),
  })

  /** Story suivante : d'abord la personne, puis la personne suivante (spec). */
  const next = React.useCallback(() => {
    if (!group) return
    if (idx + 1 < group.items.length) {
      setIdx(idx + 1)
      return
    }
    if (gi + 1 < groups.length) {
      setGi(gi + 1)
      setIdx(0)
      return
    }
    onClose()
  }, [group, idx, gi, groups.length, onClose])

  const prev = React.useCallback(() => {
    if (idx > 0) {
      setIdx(idx - 1)
      return
    }
    if (gi > 0) {
      const prevGroup = groups[gi - 1]
      if (prevGroup) {
        setGi(gi - 1)
        setIdx(Math.max(0, prevGroup.items.length - 1))
      }
    }
  }, [idx, gi, groups])

  // Avancement automatique (photos 5 s ; vidéos pilotées par l'élément)
  React.useEffect(() => {
    if (!item || item.type !== 'PHOTO') return
    setProgress(0)
    const started = Date.now()
    const t = setInterval(() => {
      const p = Math.min(100, ((Date.now() - started) / 5000) * 100)
      setProgress(p)
      if (p >= 100) next()
    }, 100)
    return () => clearInterval(t)
  }, [idx, gi, item, next])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev, onClose])

  if (!group || !item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" role="dialog" aria-modal="true" aria-label={`Story de ${name}`}>
      <div className="relative flex h-full w-full max-w-md flex-col">
        {/* Barres de progression */}
        <div className="flex gap-1 p-3">
          {group.items.map((s, i) => (
            <span key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              <span
                className={cn('block h-full bg-white transition-all', i < idx && 'w-full')}
                style={i === idx ? { width: `${progress}%` } : undefined}
              />
            </span>
          ))}
        </div>

        {/* En-tête */}
        <div className="flex items-center gap-2 px-3 pb-2 text-white">
          <Avatar src={group.author.avatarUrl} name={name} className="h-8 w-8" />
          <span className="text-sm font-bold">{name}</span>
          <span className="text-xs text-white/70">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr })}
          </span>
          <span className="ml-auto flex items-center gap-1">
            {/* Mes stories : mémoriser dans mon album stories */}
            {group.isMe && (
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-white/15"
                aria-label={isSaved ? t('story_unsave') : t('story_save')}
                title={isSaved ? t('story_unsave') : t('story_save')}
                onClick={() =>
                  isSaved
                    ? unsave.mutate({ storyId: item.id })
                    : save.mutate({ storyId: item.id })
                }
              >
                {isSaved ? (
                  <BookmarkCheck className="h-4 w-4 text-secondary-400" aria-hidden />
                ) : (
                  <Bookmark className="h-4 w-4" aria-hidden />
                )}
              </button>
            )}
            {!group.isMe && (
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg p-2 hover:bg-white/15"
                aria-label={item.likedByMe ? t('story_like_remove') : t('story_like_aria')}
                aria-pressed={!!item.likedByMe}
                title={item.likedByMe ? t('story_like_remove') : t('story_like_aria')}
                onClick={() =>
                  item.likedByMe
                    ? unlike.mutate({ storyId: item.id })
                    : like.mutate({ storyId: item.id })
                }
              >
                <Heart
                  className={cn('h-5 w-5', item.likedByMe && 'fill-rose-500 text-rose-500')}
                  aria-hidden
                />
                {(item.likes ?? 0) > 0 && (
                  <span className="text-xs font-bold">{item.likes}</span>
                )}
              </button>
            )}
            {group.isMe && (
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-white/15"
                aria-label="Supprimer ma story"
                onClick={() => remove.mutate({ id: item.id })}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            )}
            <button type="button" className="rounded-lg p-2 hover:bg-white/15" aria-label="Fermer" onClick={onClose}>
              <X className="h-5 w-5" aria-hidden />
            </button>
          </span>
        </div>

        {/* Média — clic = story suivante (spec) */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-3">
          {/* Zones de navigation tactiles */}
          <button
            type="button"
            className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-w-resize"
            aria-label="Story précédente"
            onClick={prev}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-e-resize"
            aria-label="Story suivante"
            onClick={next}
          />
          {item.type === 'VIDEO' ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={item.mediaUrl}
              className="pointer-events-none max-h-full max-w-full rounded-2xl"
              autoPlay
              onEnded={next}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.mediaUrl}
              alt={item.caption ?? `Story de ${name}`}
              className="pointer-events-none max-h-full max-w-full rounded-2xl object-contain"
            />
          )}
          {item.caption && (
            <p className="pointer-events-none absolute inset-x-6 bottom-6 rounded-xl bg-black/60 p-3 text-center text-sm font-semibold text-white backdrop-blur">
              {item.caption}
            </p>
          )}
          {/* Indicateurs de navigation */}
          <span className="pointer-events-none absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white">
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </span>
          <span className="pointer-events-none absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white">
            <ChevronRight className="h-5 w-5" aria-hidden />
          </span>
        </div>

        <p className="pb-4 text-center text-[11px] text-white/60">
          {t('story_next_hint')} · {idx + 1}/{total} — {name}
          {gi + 1 < groups.length && ` · ${t('story_then_next')}`}
        </p>
      </div>
    </div>
  )
}
