'use client'

import { CalendarDays, Film, History, Image as ImageIcon, Tag } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { formatFullDate } from '@/lib/date'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

/**
 * SOUVENIRS — uniquement les photos et vidéos liées aux événements :
 * publiées dans un plan auquel j'ai participé, ou sur lesquelles je suis
 * identifié (par moi ou par quelqu'un d'autre).
 */
export function MemoriesSection() {
  const memories = trpc.albums.memories.useQuery()
  const [filter, setFilter] = React.useState<'all' | 'photos' | 'videos'>('all')

  if (memories.isLoading) return <LoadingSpinner label="Chargement des souvenirs" />

  const all = memories.data ?? []
  const list = all.filter((m) =>
    filter === 'all' ? true : filter === 'photos' ? m.type !== 'VIDEO' : m.type === 'VIDEO',
  )

  return (
    <section aria-labelledby="profile-memories" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="profile-memories" className="flex items-center gap-2 text-lg font-bold">
          <History className="h-5 w-5 text-primary-600" aria-hidden /> Mes souvenirs
        </h2>
        <div
          className="flex gap-1 rounded-full bg-bg-secondary p-1"
          role="group"
          aria-label="Type de souvenir"
        >
          {(
            [
              ['all', 'Tout'],
              ['photos', 'Photos'],
              ['videos', 'Vidéos'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                filter === key ? 'bg-card text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-fg-muted">
        Photos et vidéos postées dans vos plans, et clichés où vous êtes identifié.
      </p>

      {list.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Pas encore de souvenir"
          description="Participez à un plan et ajoutez vos photos : elles apparaîtront ici."
          action={
            <Button asChild>
              <Link href="/events/calendar">Voir les plans</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {list.map((m) => {
            const event = m.album.event
            const tagged = m.identifications.length > 0
            return (
              <li key={m.id}>
                <Link
                  href={`/events/${event.slug}/photos`}
                  className="group relative block aspect-square overflow-hidden rounded-xl border border-border bg-bg-secondary"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.thumbnailUrl ?? m.url}
                    alt={m.caption ?? `Souvenir de ${event.title}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {m.type === 'VIDEO' && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white">
                      <Film className="h-3 w-3" aria-hidden />
                    </span>
                  )}
                  {tagged && (
                    <span
                      className="absolute right-1.5 top-1.5 rounded-full bg-[#ec4899]/90 p-1 text-white"
                      title="Vous êtes identifié sur cette photo"
                    >
                      <Tag className="h-3 w-3" aria-hidden />
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-6 text-[10px] font-semibold leading-tight text-white">
                    <span className="line-clamp-2">{event.title}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-[9px] font-medium text-white/80">
                      <CalendarDays className="h-2.5 w-2.5" aria-hidden />
                      {formatFullDate(event.startDate)}
                    </span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
