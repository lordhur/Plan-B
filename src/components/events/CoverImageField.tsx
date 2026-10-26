'use client'

import { ImageIcon, Link2, Loader2, Trash2, Upload } from 'lucide-react'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CoverImageFieldProps {
  /** URL déjà enregistrée ('' = aucune). */
  value: string
  onChange: (url: string) => void
}

const MAX_FILE = 10 * 1024 * 1024
const MAX_EDGE = 1600

/** Compresse l'image dans le navigateur (WebP 1600 px) avant téléversement. */
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
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.82),
  )
  return blob ?? file
}

/**
 * Image de couverture d'un plan :
 * - import depuis l'ordinateur / le téléphone (appareil photo inclus) ;
 * - ou coller une URL d'image.
 * L'aperçu est immédiat ; le fichier est compressé côté navigateur puis
 * téléversé vers /api/cover.
 */
export function CoverImageField({ value, onChange }: CoverImageFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [preview, setPreview] = React.useState<string>(value)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [urlDraft, setUrlDraft] = React.useState('')

  const uploadFile = React.useCallback(
    async (file: File) => {
      setError(null)
      if (!file.type.startsWith('image/')) {
        setError('Choisissez un fichier image.')
        return
      }
      if (file.size > MAX_FILE) {
        setError('Image trop lourde (10 Mo max.).')
        return
      }
      // Aperçu immédiat pendant la compression
      const objectUrl = URL.createObjectURL(file)
      setPreview(objectUrl)
      setUploading(true)
      try {
        const blob = await compressImage(file)
        const form = new FormData()
        form.append('file', blob, 'cover.webp')
        const res = await fetch('/api/cover', { method: 'POST', body: form })
        const json = (await res.json()) as { url?: string; error?: string }
        if (!res.ok || !json.url) throw new Error(json.error || 'Téléversement impossible')
        URL.revokeObjectURL(objectUrl)
        setPreview(json.url)
        onChange(json.url)
      } catch (e) {
        URL.revokeObjectURL(objectUrl)
        setPreview(value)
        setError(e instanceof Error ? e.message : 'Téléversement impossible')
      } finally {
        setUploading(false)
      }
    },
    [onChange, value],
  )

  const applyUrl = () => {
    setError(null)
    const v = urlDraft.trim()
    try {
      const parsed = new URL(v)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error()
    } catch {
      setError('Collez une URL d’image valide (https://…).')
      return
    }
    setPreview(v)
    onChange(v)
    setUrlDraft('')
  }

  const remove = () => {
    setError(null)
    setPreview('')
    setUrlDraft('')
    onChange('')
  }

  return (
    <fieldset className="rounded-2xl border border-border/70 p-4">
      <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold">
        <ImageIcon className="h-4 w-4 text-primary-500" aria-hidden /> Image de couverture
      </legend>
      <p className="mt-1 text-xs text-fg-muted">
        Une image vaut mille mots : importez une photo depuis votre appareil ou collez une URL.
      </p>

      {preview ? (
        <div className="group relative mt-3 overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Aperçu de l’image de couverture"
            className="h-44 w-full object-cover sm:h-52"
            onError={() => {
              setError('Cette URL d’image ne se charge pas.')
              setPreview(value.startsWith('/') ? value : '')
            }}
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> Envoi…
            </div>
          )}
          <button
            type="button"
            onClick={remove}
            disabled={uploading}
            aria-label="Retirer l’image de couverture"
            className="absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-transform hover:scale-105 hover:bg-danger-600"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-3 flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm font-medium text-fg-muted transition-colors hover:border-primary-500 hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-950/30 dark:hover:text-primary-300"
        >
          {uploading ? (
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-7 w-7" aria-hidden />
          )}
          {uploading ? 'Envoi de l’image…' : 'Importer une photo (ordinateur ou téléphone)'}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only-focusable h-1 w-1"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void uploadFile(f)
          e.target.value = ''
        }}
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="min-w-0 flex-1">
          <Label htmlFor="cover-url" className="sr-only-focusable">
            Ou coller l’URL d’une image
          </Label>
          <Input
            id="cover-url"
            type="url"
            inputMode="url"
            placeholder="…ou coller une URL d’image (https://…)"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyUrl()
              }
            }}
          />
        </div>
        <Button type="button" variant="secondary" onClick={applyUrl} disabled={!urlDraft.trim()}>
          <Link2 className="h-4 w-4" aria-hidden /> Utiliser
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-danger-500">
          {error}
        </p>
      )}
    </fieldset>
  )
}
