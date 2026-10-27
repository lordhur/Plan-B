'use client'

import { useState } from 'react'
import { FolderPlus, ImagePlus, Loader2, RefreshCw, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { trpc } from '@/lib/trpc'
import { uploadToStorage } from '@/lib/supabaseUpload'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { useLang } from '@/lib/i18n'

/**
 * Albums photos personnels du profil (spec).
 * - Mon profil : créer / renommer / supprimer / ajouter des photos,
 *   importer mes photos Facebook & Instagram (comptes reliés).
 * - Profil d'un autre membre : consultation des albums publics.
 */
export function AlbumsSection({ userId, isMe }: { userId: string; isMe: boolean }) {
  const { t } = useLang()
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [uploading, setUploading] = useState(false)

  const albums = isMe
    ? trpc.albums.myAlbums.useQuery(undefined, { refetchInterval: false })
    : trpc.albums.memberAlbums.useQuery({ userId })
  const detail = trpc.albums.albumPhotos.useQuery(
    { id: openId ?? '' },
    { enabled: !!openId },
  )

  const create = trpc.albums.createAlbum.useMutation({
    onSuccess: () => {
      setCreating(false)
      setName('')
      void albums.refetch()
      toast.success('Album créé')
    },
  })
  const remove = trpc.albums.deleteAlbum.useMutation({
    onSuccess: () => {
      setOpenId(null)
      void albums.refetch()
    },
  })
  const addPhoto = trpc.albums.addPhotoToAlbum.useMutation({
    onSuccess: () => {
      setUploading(false)
      void albums.refetch()
      void detail.refetch()
    },
    onError: (e) => {
      setUploading(false)
      toast.error(e.message)
    },
  })

  // Import Facebook / Instagram (comptes reliés via la connexion sociale)
  const accounts = trpc.oauth.myAccounts.useQuery(undefined, { enabled: isMe })
  const sync = trpc.oauth.syncPhotos.useMutation({
    onSuccess: (r) => {
      void accounts.refetch()
      void albums.refetch()
      toast.success(`${r.imported} photo(s) importée(s) dans vos photos de profil`)
    },
    onError: (e) => toast.error(e.message),
  })

  const list = albums.data ?? []

  return (
    <section className="mt-5 w-full text-left" aria-label="Albums photos">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-fg-muted">{t('prof_albums')}</h3>
        {isMe && (
          <Button variant="outline" size="sm" onClick={() => setCreating((v) => !v)}>
            <FolderPlus className="h-3.5 w-3.5" aria-hidden /> {t('prof_create_album')}
          </Button>
        )}
      </div>

      {/* Import réseaux sociaux */}
      {isMe && (accounts.data ?? []).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(accounts.data ?? []).map((a) => (
            <Button
              key={a.id}
              variant="secondary"
              size="sm"
              disabled={sync.isPending || a.provider === 'google'}
              title={
                a.provider === 'google'
                  ? 'Google ne partage que la photo de profil'
                  : `Importer mes photos ${a.provider === 'facebook' ? 'Facebook' : 'Instagram'}`
              }
              onClick={() => sync.mutate({ provider: a.provider as 'facebook' | 'instagram' | 'google' })}
            >
              {sync.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              )}
              Photos {a.provider === 'facebook' ? 'Facebook' : a.provider === 'instagram' ? 'Instagram' : 'Google'}
            </Button>
          ))}
        </div>
      )}

      {creating && (
        <form
          className="mt-2 flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) create.mutate({ name: name.trim() })
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('prof_album_name')}
            maxLength={80}
            aria-label={t('prof_album_name')}
            className="h-9"
          />
          <Button type="submit" size="sm" disabled={create.isPending || !name.trim()}>
            {create.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            Créer
          </Button>
        </form>
      )}

      {list.length === 0 && (
        <p className="mt-2 text-xs text-fg-muted">
          {isMe
            ? t('prof_no_album_me')
            : t('prof_no_album')}
        </p>
      )}

      <div className="mt-2 grid w-full grid-cols-3 gap-1.5 sm:grid-cols-4">
        {list.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setOpenId(openId === a.id ? null : a.id)}
            className={cn(
              'group relative aspect-square overflow-hidden rounded-xl border border-border bg-bg-secondary',
              openId === a.id && 'ring-2 ring-primary-600',
            )}
            aria-expanded={openId === a.id}
          >
            {a.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-fg-muted">
                <ImagePlus className="h-5 w-5" aria-hidden />
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1 text-left text-[10px] font-bold text-white">
              {a.name} · {a.count}
            </span>
          </button>
        ))}
      </div>

      {/* Contenu de l'album ouvert */}
      {openId && (
        <div className="mt-2 rounded-xl border border-border bg-bg-secondary p-2">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="truncate text-sm font-bold">{detail.data?.name ?? 'Album'}</p>
            <div className="flex items-center gap-1">
              {isMe && (
                <>
                  <label className="flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-primary-600 px-2 text-xs font-semibold text-white">
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Ajouter
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        setUploading(true)
                        try {
                          const url = await uploadToStorage(f, 'albums')
                          addPhoto.mutate({ albumId: openId, url })
                        } catch (err) {
                          setUploading(false)
                          toast.error(err instanceof Error ? err.message : 'Upload impossible')
                        }
                        e.target.value = ''
                      }}
                    />
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Supprimer l’album"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate({ id: openId })}
                  >
                    <Trash2 className="h-4 w-4 text-danger-600" aria-hidden />
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" aria-label="Fermer l’album" onClick={() => setOpenId(null)}>
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
          {detail.isLoading ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-fg-muted" aria-label="Chargement" />
          ) : (detail.data?.photos.length ?? 0) === 0 ? (
            <p className="py-2 text-center text-xs text-fg-muted">{t('prof_empty_album')}</p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {(detail.data?.photos ?? []).map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={p.url}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full rounded-lg object-cover"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
