'use client'

import { Plus, Trash2, X } from 'lucide-react'
import * as React from 'react'
import { trpc } from '@/lib/trpc'
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

/** Barre de stories (24 h) — moi + mes amis, façon réseaux sociaux. */
export function StoryRail() {
  const { isAuthenticated } = useCurrentUser()
  const stories = trpc.stories.feed.useQuery(undefined, { enabled: isAuthenticated })
  const [viewing, setViewing] = React.useState<StoryGroup | null>(null)
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
        aria-label="Ajouter une story"
      >
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-primary-400 bg-primary-50 dark:bg-primary-500/10">
          <Plus className="h-6 w-6 text-primary-600" aria-hidden />
        </span>
        <span className="text-[10px] font-semibold text-fg-muted">Ma story</span>
      </button>

      {groups.map((g) => {
        const name = g.author.displayName || `${g.author.firstName} ${g.author.lastName}`
        return (
          <button
            key={g.author.id}
            type="button"
            onClick={() => setViewing(g)}
            className="flex w-16 shrink-0 flex-col items-center gap-1"
            aria-label={`Voir la story de ${name}`}
          >
            <span className="rounded-full bg-gradient-to-tr from-primary-600 to-secondary-500 p-[2.5px]">
              <Avatar
                src={g.author.avatarUrl}
                name={name}
                className="h-[59px] w-[59px] border-2 border-card"
              />
            </span>
            <span className="w-full truncate text-center text-[10px] font-semibold text-fg-muted">
              {g.isMe ? 'Ma story' : g.author.firstName}
            </span>
          </button>
        )
      })}

      {creating && <StoryCreateDialog onClose={() => setCreating(false)} />}
      {viewing && <StoryViewer group={viewing} onClose={() => setViewing(null)} />}
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
      aria-label="Ajouter une story"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Ajouter une story</h2>
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
            📷 Photo
          </Button>
          <Button variant={type === 'VIDEO' ? 'default' : 'outline'} className="flex-1" onClick={() => pick('VIDEO')}>
            🎬 Vidéo
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
          placeholder="Légende (facultatif)"
          maxLength={200}
          className="mb-4"
          aria-label="Légende de la story"
        />

        <Button className="w-full" disabled={!file || uploading || create.isPending} onClick={publish}>
          {uploading || create.isPending ? 'Publication…' : 'Publier ma story'}
        </Button>
        <p className="mt-2 text-center text-[11px] text-fg-muted">
          Visible par vos amis pendant 24 h · max 50 Mo
        </p>
      </div>
    </div>
  )
}

/** Visionneuse plein écran avec barre de progression et suppression. */
function StoryViewer({ group, onClose }: { group: StoryGroup; onClose: () => void }) {
  const [idx, setIdx] = React.useState(0)
  const [progress, setProgress] = React.useState(0)
  const utils = trpc.useUtils()
  const remove = trpc.stories.remove.useMutation({
    onSuccess: () => {
      void utils.stories.feed.invalidate()
      onClose()
    },
  })
  const item = group.items[idx]
  const total = group.items.length
  const name = group.author.displayName || `${group.author.firstName} ${group.author.lastName}`

  // Avancement automatique (photos 5 s ; vidéos pilotées par l'élément)
  React.useEffect(() => {
    if (!item || item.type !== 'PHOTO') return
    setProgress(0)
    const started = Date.now()
    const t = setInterval(() => {
      const p = Math.min(100, ((Date.now() - started) / 5000) * 100)
      setProgress(p)
      if (p >= 100) {
        if (idx + 1 < total) setIdx(idx + 1)
        else onClose()
      }
    }, 100)
    return () => clearInterval(t)
  }, [idx, item, total, onClose])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && idx + 1 < total) setIdx(idx + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, total, onClose])

  if (!item) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" role="dialog" aria-modal="true" aria-label={`Story de ${name}`}>
      <div className="relative flex h-full w-full max-w-md flex-col">
        {/* Barres de progression */}
        <div className="flex gap-1 p-3">
          {group.items.map((s, i) => (
            <span key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              <span
                className={cn('block h-full bg-white transition-all', i < idx && 'w-full', i === idx && '')}
                style={i === idx ? { width: `${progress}%` } : undefined}
              />
            </span>
          ))}
        </div>

        {/* En-tête */}
        <div className="flex items-center gap-2 px-3 pb-2 text-white">
          <Avatar src={group.author.avatarUrl} name={name} size="sm" />
          <span className="text-sm font-bold">{name}</span>
          <span className="text-xs text-white/70">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr })}
          </span>
          <span className="ml-auto flex items-center gap-1">
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

        {/* Média */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-3">
          {item.type === 'VIDEO' ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={item.mediaUrl}
              className="max-h-full max-w-full rounded-2xl"
              autoPlay
              controls
              onEnded={() => (idx + 1 < total ? setIdx(idx + 1) : onClose())}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.mediaUrl} alt={item.caption ?? `Story de ${name}`} className="max-h-full max-w-full rounded-2xl object-contain" />
          )}
          {item.caption && (
            <p className="absolute inset-x-6 bottom-6 rounded-xl bg-black/60 p-3 text-center text-sm font-semibold text-white backdrop-blur">
              {item.caption}
            </p>
          )}
        </div>

        {/* Navigation */}
        {total > 1 && (
          <div className="flex justify-between px-4 pb-4">
            <Button variant="secondary" size="sm" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
              Précédent
            </Button>
            <Button variant="secondary" size="sm" disabled={idx + 1 >= total} onClick={() => setIdx(idx + 1)}>
              Suivant
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
