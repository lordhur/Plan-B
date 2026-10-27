'use client'

import { ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'

const MAX_PHOTOS = 6
const MAX_EDGE = 1600

/** Compresse une photo dans le navigateur (WebP 1600 px). */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  const blob: Blob | null = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.82),
  )
  return blob ?? file
}

/**
 * Galerie de photos (jusqu'à 6) : import appareil/ordinateur, compression
 * WebP côté navigateur, téléversement via /api/attachment.
 */
export function MultiPhotoField({
  value,
  onChange,
}: {
  value: string[]
  onChange: (photos: string[]) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const room = MAX_PHOTOS - value.length
    const picked = Array.from(files).slice(0, room)
    if (picked.length === 0) {
      toast.error('Limite atteinte', `${MAX_PHOTOS} photos maximum.`)
      return
    }
    setBusy(true)
    try {
      for (const file of picked) {
        const blob = await compressImage(file)
        const form = new FormData()
        form.append('file', new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }))
        const res = await fetch('/api/attachment', { method: 'POST', body: form })
        const json = (await res.json()) as { url?: string; error?: string }
        if (!res.ok || !json.url) throw new Error(json.error || 'Téléversement impossible')
        onChange([...value, json.url])
      }
    } catch (e) {
      toast.error('Ajout impossible', e instanceof Error ? e.message : 'Réessayez.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <Label>Photos ({value.length}/{MAX_PHOTOS})</Label>
      <div className="grid grid-cols-3 gap-2">
        {value.map((url, i) => (
          <div key={`${url}-${i}`} className="relative aspect-square overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label={`Retirer la photo ${i + 1}`}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-danger-500"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ))}
        {value.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-fg-muted transition-colors hover:border-primary-300 hover:text-primary-600"
          >
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            ) : (
              <>
                <Plus className="h-6 w-6" aria-hidden />
                <span className="text-[11px] font-semibold">Ajouter</span>
              </>
            )}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void addFiles(e.target.files)}
      />
      <p className="flex items-center gap-1.5 text-xs text-fg-muted">
        <ImageIcon className="h-3.5 w-3.5" aria-hidden />
        Jusqu’à {MAX_PHOTOS} photos — comprimées automatiquement pour rester légères.
      </p>
    </div>
  )
}
