'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Bookmark, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

/**
 * Album stories du profil (spec) : les stories mémorisées pendant la lecture,
 * dans l'ordre choisi par le membre (flèches haut/bas).
 */
export function SavedStoriesSection() {
  const [openId, setOpenId] = useState<string | null>(null)
  const saved = trpc.stories.mySavedStories.useQuery(undefined, { refetchInterval: false })
  const reorder = trpc.stories.reorderSavedStory.useMutation({
    onSuccess: () => void saved.refetch(),
  })
  const unsave = trpc.stories.unsaveStory.useMutation({
    onSuccess: () => void saved.refetch(),
  })

  const rows = saved.data ?? []
  if (rows.length === 0) {
    return (
      <section className="mt-5 w-full text-left" aria-label="Album stories">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-fg-muted">
          <Bookmark className="h-3.5 w-3.5" aria-hidden /> Album stories
        </h3>
        <p className="mt-1 text-xs text-fg-muted">
          Mémorisez des stories avec l’icône signet pendant leur lecture — elles apparaîtront ici,
          dans l’ordre de votre choix.
        </p>
      </section>
    )
  }

  const open = rows.find((r) => r.id === openId)

  return (
    <section className="mt-5 w-full text-left" aria-label="Album stories">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-fg-muted">
        <Bookmark className="h-3.5 w-3.5 text-primary-600" aria-hidden /> Album stories
        <span className="rounded-full bg-primary-100 px-1.5 text-[10px] font-bold text-primary-700">
          {rows.length}
        </span>
      </h3>

      <ol className="mt-2 grid w-full grid-cols-3 gap-1.5 sm:grid-cols-4">
        {rows.map((r, i) => (
          <li key={r.id} className="relative">
            <button
              type="button"
              onClick={() => setOpenId(openId === r.id ? null : r.id)}
              className={cn(
                'block aspect-[9/14] w-full overflow-hidden rounded-xl border border-border bg-black',
                openId === r.id && 'ring-2 ring-primary-600',
              )}
              aria-label={`Story mémorisée ${i + 1} — voir`}
            >
              {r.story.type === 'VIDEO' ? (
                <span className="relative flex h-full w-full items-center justify-center bg-neutral-900">
                  <Play className="h-6 w-6 text-white" aria-hidden />
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.story.mediaUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
              )}
              <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[9px] font-semibold text-white">
                {r.story.author.firstName}
              </span>
            </button>
            {/* Ordre de l'album */}
            <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[9px] font-bold text-white">
              {i + 1}
            </span>
          </li>
        ))}
      </ol>

      {/* Gestion de l'élément ouvert : ordre + retrait */}
      {open && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-bg-secondary p-2">
          <Avatar
            src={open.story.author.avatarUrl}
            name={open.story.author.firstName}
            className="h-7 w-7"
          />
          <p className="mr-auto truncate text-xs font-semibold">
            Story de {open.story.author.firstName} {open.story.author.lastName}
            {open.story.caption ? ` — « ${open.story.caption} »` : ''}
          </p>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Monter dans l’album"
            disabled={reorder.isPending}
            onClick={() => reorder.mutate({ id: open.id, direction: 'up' })}
          >
            <ArrowUp className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Descendre dans l’album"
            disabled={reorder.isPending}
            onClick={() => reorder.mutate({ id: open.id, direction: 'down' })}
          >
            <ArrowDown className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Retirer de l’album"
            disabled={unsave.isPending}
            onClick={() => unsave.mutate({ storyId: open.story.id })}
          >
            <Trash2 className="h-4 w-4 text-danger-600" aria-hidden />
          </Button>
        </div>
      )}
    </section>
  )
}
