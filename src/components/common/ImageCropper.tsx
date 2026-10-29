'use client'

import { Loader2, Move, ZoomIn } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'

/**
 * RECADRAGE D'IMAGE — aperçu plein cadre, déplacement au doigt/souris et zoom.
 * Le résultat est exporté en WebP (ou JPEG si le navigateur ne sait pas) à la
 * taille demandée, prêt à être envoyé sur le stockage.
 */
export function ImageCropper({
  file,
  aspect,
  outputWidth = 1600,
  title = 'Recadrer la photo',
  onCancel,
  onDone,
}: {
  file: File
  /** Largeur / hauteur du cadre (ex. 16 / 6 pour une couverture). */
  aspect: number
  outputWidth?: number
  title?: string
  onCancel: () => void
  onDone: (cropped: File) => void
}) {
  const frameRef = React.useRef<HTMLDivElement | null>(null)
  const imgRef = React.useRef<HTMLImageElement | null>(null)
  const [url, setUrl] = React.useState<string | null>(null)
  const [natural, setNatural] = React.useState<{ w: number; h: number } | null>(null)
  const [frame, setFrame] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [offset, setOffset] = React.useState({ x: 0, y: 0 })
  const [busy, setBusy] = React.useState(false)
  const drag = React.useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  // URL locale de l'image à recadrer
  React.useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  // Dimensions du cadre (responsive)
  React.useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const measure = () => setFrame({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const baseScale = React.useMemo(() => {
    if (!natural || frame.w === 0 || frame.h === 0) return 1
    return Math.max(frame.w / natural.w, frame.h / natural.h)
  }, [natural, frame])

  const scale = baseScale * zoom

  const clamp = React.useCallback(
    (next: { x: number; y: number }, sc = scale) => {
      if (!natural) return next
      const dw = natural.w * sc
      const dh = natural.h * sc
      const maxX = Math.max(0, (dw - frame.w) / 2)
      const maxY = Math.max(0, (dh - frame.h) / 2)
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      }
    },
    [natural, scale, frame],
  )

  // Le zoom peut sortir du cadre : on recadre aussitôt les décalages
  React.useEffect(() => {
    setOffset((o) => clamp(o))
  }, [clamp])

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    setOffset(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }))
  }
  const endDrag = () => {
    drag.current = null
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 20 : 8
    if (e.key === 'ArrowLeft') setOffset((o) => clamp({ x: o.x - step, y: o.y }))
    else if (e.key === 'ArrowRight') setOffset((o) => clamp({ x: o.x + step, y: o.y }))
    else if (e.key === 'ArrowUp') setOffset((o) => clamp({ x: o.x, y: o.y - step }))
    else if (e.key === 'ArrowDown') setOffset((o) => clamp({ x: o.x, y: o.y + step }))
    else return
    e.preventDefault()
  }

  const confirm = async () => {
    const img = imgRef.current
    if (!img || !natural || frame.w === 0) return
    setBusy(true)
    try {
      const outW = outputWidth
      const outH = Math.round(outputWidth / aspect)
      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas indisponible')

      // Coin supérieur gauche de l'image affichée, relativement au cadre
      const left = (frame.w - natural.w * scale) / 2 + offset.x
      const top = (frame.h - natural.h * scale) / 2 + offset.y
      const sx = -left / scale
      const sy = -top / scale
      const sw = frame.w / scale
      const sh = frame.h / scale

      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/webp', 0.9),
      )
      if (!blob) throw new Error('Export impossible')
      const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
      const out = new File([blob], `recadre-${Date.now()}.${ext}`, { type: blob.type })
      onDone(out)
    } catch {
      onDone(file)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-lg rounded-2xl bg-bg p-4 shadow-2xl">
        <h2 className="mb-1 text-base font-bold">{title}</h2>
        <p className="mb-3 flex items-center gap-1.5 text-xs text-fg-muted">
          <Move className="h-3.5 w-3.5" aria-hidden /> Faites glisser la photo, puis ajustez le
          zoom.
        </p>

        <div
          ref={frameRef}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          className="relative w-full cursor-grab touch-none select-none overflow-hidden rounded-xl bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500 active:cursor-grabbing"
          style={{ aspectRatio: `${aspect}` }}
          aria-label="Zone de recadrage — flèches du clavier pour ajuster"
        >
          {url && natural && frame.w > 0 && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={url}
              alt="Aperçu du recadrage"
              draggable={false}
              onLoad={(e) => {
                const el = e.currentTarget
                setNatural({ w: el.naturalWidth, h: el.naturalHeight })
              }}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{
                width: natural.w * scale,
                height: natural.h * scale,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          )}
          {/* Repères de cadrage */}
          <span
            className="pointer-events-none absolute inset-0 border-2 border-white/60"
            aria-hidden
          />
        </div>

        <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-fg-muted">
          <ZoomIn className="h-4 w-4" aria-hidden /> Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="h-1.5 flex-1 accent-accent-600"
            aria-label="Zoom de la photo"
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Annuler
          </Button>
          <Button type="button" onClick={() => void confirm()} disabled={busy || !natural}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Recadrer et enregistrer
          </Button>
        </div>
      </div>
    </div>
  )
}
