'use client'

import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import * as React from 'react'

import { ImageCropper } from '@/components/common/ImageCropper'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { uploadToStorage, MAX_STORAGE_FILE } from '@/lib/supabaseUpload'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

/**
 * PHOTO DE COUVERTURE (profil) — bandeau importable depuis l'appareil.
 * Comme les photos de profil : envoi direct vers Supabase Storage, puis
 * enregistrement de l'URL sur le compte.
 */
export function ProfileCoverSection() {
  const utils = trpc.useUtils()
  const { data: me } = trpc.auth.me.useQuery()
  const input = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [toCrop, setToCrop] = React.useState<File | null>(null)

  const save = trpc.users.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate()
      toast.success('Photo de couverture mise à jour ✓')
    },
    onError: (err) => toast.error(err.message),
  })

  const onFile = async (file?: File | null) => {
    if (!file) return
    if (file.size > MAX_STORAGE_FILE) {
      toast.error('Fichier trop lourd (50 Mo max)')
      return
    }
    setUploading(true)
    try {
      const url = await uploadToStorage(file, 'cover')
      save.mutate({ coverImage: url })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setUploading(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg">
      <div className="relative">
        {me?.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={me.coverImage}
            alt="Ma photo de couverture"
            className="h-36 w-full object-cover sm:h-44"
          />
        ) : (
          <div className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-primary-600/90 to-accent-600/90 sm:h-44">
            <span className="text-sm font-semibold text-white/90">Aucune photo de couverture</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 bg-gradient-to-t from-black/55 to-transparent p-3">
          {me?.coverImage && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-9 gap-1.5 bg-black/35 text-white hover:bg-black/55 hover:text-white"
              disabled={uploading}
              onClick={() => save.mutate({ coverImage: null })}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Retirer</span>
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="h-9 gap-1.5"
            disabled={uploading}
            onClick={() => input.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden />
            )}
            {me?.coverImage ? 'Changer' : 'Importer une couverture'}
          </Button>
        </div>
      </div>

      <p className={cn('px-4 py-3 text-xs text-fg-muted')}>
        Bandeau affiché en haut de votre profil. JPG, PNG, WebP ou GIF — 50 Mo max.
      </p>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Choisir une photo de couverture"
        onChange={(e) => {
          const picked = e.target.files?.[0] ?? null
          if (e.target) e.target.value = ''
          if (picked) setToCrop(picked)
        }}
      />

      {/* Recadrage obligatoire avant l'envoi */}
      {toCrop && (
        <ImageCropper
          file={toCrop}
          aspect={16 / 6}
          outputWidth={1600}
          title="Recadrer ma photo de couverture"
          onCancel={() => setToCrop(null)}
          onDone={(cropped) => {
            setToCrop(null)
            void onFile(cropped)
          }}
        />
      )}
    </div>
  )
}
