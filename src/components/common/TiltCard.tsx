import * as React from 'react'
import { cn } from '@/lib/utils'

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Reflet balayé automatiquement sur toute la carte au survol. */
  glare?: boolean
}

/**
 * Carte interactive « signature » — 100 % CSS, zéro écouteur souris :
 * - élévation/zoom doux au survol (transform GPU) ;
 * - une bande de reflet balaie automatiquement toute la longueur au survol ;
 * - ombre pré-rendue dont seule l'opacité change (aucun repaint coûteux).
 *
 * Désactivée proprement si `prefers-reduced-motion: reduce` (voir globals.css).
 */
export function TiltCard({ glare = true, className, children, ...props }: TiltCardProps) {
  return (
    <div
      className={cn(
        'tilt-card lift-shadow relative overflow-hidden',
        glare && 'sheen-hover',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
