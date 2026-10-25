'use client'

import { ArrowLeft, Camera, Image as ImageIcon, Trash2, Upload } from 'lucide-react'
import Link from 'next/link'
import { use, useRef, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { toast } from '@/components/ui/toast'
import { formatRelative } from '@/lib/date'

/** Album photos de l'événement (spec Phase 3 §3.2) — upload réservé aux participants. */
export default function EventPhotosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { user, isAuthenticated } = useCurrentUser()
  const event = trpc.events.bySlug.useQuery({ slug })
  const album = trpc.albums.byEvent.useQuery(
    { eventId: event.data?.id ?? '' },
    { enabled: !!event.data?.id },
  )
  const utils = trpc.useUtils()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const deleteMedia = trpc.albums.deleteMedia.useMutation({
    onSuccess: () => void utils.albums.byEvent.invalidate(),
    onError: (e) => toast.error(e.message),
  })

  if (event.isLoading || album.isLoading) return <LoadingSpinner label="Chargement de l’album" />
  if (!event.data || !album.data) {
    return <EmptyState icon={ImageIcon} title="Événement introuvable" description="Ce plan n’existe pas." />
  }

  const { album: data, locked, canUpload } = album.data
  const media = data?.media ?? []

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files).slice(0, 10)) {
        const form = new FormData()
        form.set('file', file)
        form.set('eventId', event.data.id)
        const res = await fetch('/api/media', { method: 'POST', body: form })
        const json = await res.json()
        if (!res.ok) {
          toast.error(json.error ?? 'Upload impossible')
          break
        }
      }
      await utils.albums.byEvent.invalidate()
      toast.success('Photos ajoutées 📸')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-0">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Retour à l’événement">
            <Link href={`/events/${slug}`}>
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Album photos</h1>
            <p className="text-sm text-fg-muted">{event.data.title}</p>
          </div>
        </div>
        {canUpload && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              aria-label="Ajouter des photos"
              onChange={(e) => void onFiles(e.target.files)}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4" aria-hidden />
              {uploading ? 'Envoi…' : 'Ajouter des photos'}
            </Button>
          </>
        )}
      </header>

      {locked && (
        <p className="rounded-xl bg-bg-secondary p-3.5 text-sm text-fg-muted">
          🔒 Album verrouillé — les ajouts ferment 30 jours après l’événement.
        </p>
      )}

      {media.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="Aucune photo pour l’instant"
          description={
            canUpload
              ? 'Partagez vos meilleurs souvenirs de l’événement !'
              : 'Les participants peuvent ajouter leurs photos pendant et jusqu’à 30 jours après l’événement.'
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((m) => {
            const mine = m.uploaderId === user?.id
            const isOrganizer = event.data.isOrganizer
            return (
              <li key={m.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.thumbnailUrl ?? m.url}
                  alt={m.caption ?? `Photo de ${m.uploader.firstName}`}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-2.5">
                  <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-white">
                    <Avatar src={m.uploader.avatarUrl} name={m.uploader.firstName} size="sm" className="h-5 w-5 text-[9px]" />
                    <span className="truncate">{m.uploader.firstName}</span>
                    <span className="shrink-0 opacity-70">{formatRelative(m.createdAt)}</span>
                  </span>
                  {isAuthenticated && (mine || isOrganizer) && (
                    <button
                      onClick={() => deleteMedia.mutate({ mediaId: m.id })}
                      aria-label="Supprimer la photo"
                      className="shrink-0 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity hover:bg-danger-500 focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
