'use client'

import { Film, ImagePlus, Star, Trash2, Upload } from 'lucide-react'
import * as React from 'react'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { uploadToStorage, MAX_STORAGE_FILE } from '@/lib/supabaseUpload'
import { cn } from '@/lib/utils'
import { EVENT_CATEGORIES } from '@/lib/constants'
import { CategoryIcon } from '@/components/common/CategoryIcon'

/** Photos, vidéo de présentation et catégories favorites du profil. */
export function ProfileMediaSection() {
  const utils = trpc.useUtils()
  const { data: me } = trpc.auth.me.useQuery()
  const photos = trpc.users.myPhotos.useQuery()
  const photoInput = React.useRef<HTMLInputElement>(null)
  const videoInput = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [favSlugs, setFavSlugs] = React.useState<string[]>([])

  // Catégories favorites actuelles
  React.useEffect(() => {
    if (me?.favoriteCategories) setFavSlugs(me.favoriteCategories.map((c) => c.slug))
  }, [me?.favoriteCategories])

  const addPhoto = trpc.users.addPhoto.useMutation({
    onSuccess: () => {
      void utils.users.myPhotos.invalidate()
      void utils.auth.me.invalidate()
      toast.success('Photo ajoutée 📸')
    },
    onError: (e) => toast.error(e.message),
  })
  const removePhoto = trpc.users.removePhoto.useMutation({
    onSuccess: () => void utils.users.myPhotos.invalidate(),
    onError: (e) => toast.error(e.message),
  })
  const setPrimary = trpc.users.setPrimaryPhoto.useMutation({
    onSuccess: () => {
      void utils.users.myPhotos.invalidate()
      void utils.auth.me.invalidate()
      toast.success('Photo principale mise à jour')
    },
    onError: (e) => toast.error(e.message),
  })
  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      void utils.auth.me.invalidate()
      toast.success('Vidéo enregistrée 🎬')
    },
    onError: (e) => toast.error(e.message),
  })
  const saveFavorites = trpc.users.setFavoriteCategories.useMutation({
    onSuccess: () => void utils.auth.me.invalidate(),
    onError: (e) => toast.error(e.message),
  })

  const handlePhoto = async (file: File | null) => {
    if (!file) return
    if (file.size > MAX_STORAGE_FILE) {
      toast.error('Fichier trop lourd (max 50 Mo)')
      return
    }
    setUploading(true)
    try {
      const url = await uploadToStorage(file, 'profile')
      addPhoto.mutate({ url })
    } catch {
      toast.error("L'envoi de la photo a échoué")
    } finally {
      setUploading(false)
    }
  }

  const handleVideo = async (file: File | null) => {
    if (!file) return
    if (file.size > MAX_STORAGE_FILE) {
      toast.error('Vidéo trop lourde (max 50 Mo)')
      return
    }
    setUploading(true)
    try {
      const url = await uploadToStorage(file, 'profile-video')
      updateProfile.mutate({ videoUrl: url })
    } catch {
      toast.error("L'envoi de la vidéo a échoué")
    } finally {
      setUploading(false)
    }
  }

  const toggleFav = (slug: string) => {
    const next = favSlugs.includes(slug)
      ? favSlugs.filter((s) => s !== slug)
      : [...favSlugs, slug].slice(0, 12)
    setFavSlugs(next)
    saveFavorites.mutate({ slugs: next })
  }

  return (
    <div className="space-y-5">
      {/* ---------- Photos ---------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImagePlus className="h-4 w-4 text-primary-600" aria-hidden /> Mes photos
          </CardTitle>
          <CardDescription>
            Jusqu’à 12 photos. La principale devient votre avatar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              void handlePhoto(e.target.files?.[0] ?? null)
              e.target.value = ''
            }}
          />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(photos.data ?? []).map((p) => (
              <div
                key={p.id}
                className={cn(
                  'group relative aspect-square overflow-hidden rounded-xl border-2',
                  p.isPrimary ? 'border-primary-500' : 'border-border',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                {p.isPrimary && (
                  <span className="absolute left-1 top-1 rounded-full bg-primary-600 p-1 text-white" title="Photo principale">
                    <Star className="h-3 w-3 fill-current" aria-hidden />
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  {!p.isPrimary && (
                    <button
                      type="button"
                      onClick={() => setPrimary.mutate({ id: p.id })}
                      className="rounded-md bg-white/20 p-1 text-white hover:bg-white/40"
                      aria-label="Définir comme photo principale"
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto.mutate({ id: p.id })}
                    className="rounded-md bg-danger-500/80 p-1 text-white hover:bg-danger-600"
                    aria-label="Supprimer cette photo"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </span>
              </div>
            ))}
            <button
              type="button"
              onClick={() => photoInput.current?.click()}
              disabled={uploading || (photos.data?.length ?? 0) >= 12}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-fg-muted transition-colors hover:border-primary-400 hover:text-primary-600 disabled:opacity-50"
            >
              <ImagePlus className="h-5 w-5" aria-hidden />
              <span className="text-[10px] font-bold">Ajouter</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ---------- Vidéo ---------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Film className="h-4 w-4 text-secondary-500" aria-hidden /> Ma vidéo de présentation
          </CardTitle>
          <CardDescription>Une courte vidéo pour vous présenter (max 50 Mo).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={videoInput}
            type="file"
            accept="video/*"
            className="sr-only"
            onChange={(e) => {
              void handleVideo(e.target.files?.[0] ?? null)
              e.target.value = ''
            }}
          />
          {me?.videoUrl ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={me.videoUrl} controls className="max-h-64 w-full rounded-xl bg-black" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => videoInput.current?.click()}
                disabled={uploading}
              >
                <Upload className="h-4 w-4" aria-hidden /> Remplacer la vidéo
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={() => videoInput.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4" aria-hidden />
              {uploading ? 'Envoi en cours…' : 'Choisir une vidéo'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ---------- Catégories favorites ---------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mes catégories favorites</CardTitle>
          <CardDescription>
            Les activités que vous aimez — elles boostent les plans suggérés dans votre fil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {EVENT_CATEGORIES.map((cat) => {
              const active = favSlugs.includes(cat.slug)
              return (
                <button
                  key={cat.slug}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleFav(cat.slug)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                    active
                      ? 'border-transparent text-white'
                      : 'border-border bg-card text-fg-muted hover:border-primary-300 hover:text-fg',
                  )}
                  style={active ? { backgroundColor: cat.color } : undefined}
                >
                  <CategoryIcon name={cat.icon} className="h-3.5 w-3.5" />
                  {cat.name}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
