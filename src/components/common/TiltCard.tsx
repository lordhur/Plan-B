'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Inclinaison maximale en degrés. */
  maxTilt?: number
  /** Reflet spéculaire suivant la souris. */
  glare?: boolean
}

/**
 * Carte interactive « signature » :
 * - s'incline en 3D et zoome légèrement en suivant la souris ;
 * - un reflet spéculaire balaye la surface sous le curseur ;
 * - bordure lumineuse au survol (classe `glow-border` sur l'enfant).
 *
 * Accessibilité & tactiles :
 * - désactivée si `prefers-reduced-motion: reduce` ;
 * - désactivée si le pointeur n'est pas précis (tactile) — les visuels
 *   gardent alors le balayage lumineux automatique (`.sheen-auto`).
 */
export function TiltCard({
  maxTilt = 7,
  glare = true,
  className,
  children,
  ...props
}: TiltCardProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [tilting, setTilting] = React.useState(false)
  const [enabled, setEnabled] = React.useState(false)

  React.useEffect(() => {
    const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finePointer = window.matchMedia('(pointer: fine)').matches
    setEnabled(motionOk && finePointer)
  }, [])

  const handleMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled || e.pointerType !== 'mouse') return
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const px = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1)
      const py = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1)
      el.style.setProperty('--mx', px.toFixed(3))
      el.style.setProperty('--my', py.toFixed(3))
      el.style.setProperty('--tilt-y', `${((px - 0.5) * 2 * maxTilt).toFixed(2)}deg`)
      el.style.setProperty('--tilt-x', `${((0.5 - py) * 2 * maxTilt).toFixed(2)}deg`)
    },
    [enabled, maxTilt],
  )

  const reset = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--tilt-x', '0deg')
    el.style.setProperty('--tilt-y', '0deg')
    setTilting(false)
  }, [])

  return (
    <div
      ref={ref}
      data-tilting={tilting || undefined}
      onPointerMove={handleMove}
      onPointerEnter={(e) => {
        if (enabled && e.pointerType === 'mouse') setTilting(true)
      }}
      onPointerLeave={reset}
      onBlur={reset}
      className={cn('tilt-card relative', className)}
      {...props}
    >
      {children}
      {glare && <span className="tilt-sheen" aria-hidden />}
    </div>
  )
}
