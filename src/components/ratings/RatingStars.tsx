'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
  value: number
  onChange?: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
  readOnly?: boolean
  /** aria-label du groupe (mode interactif). */
  label?: string
}

const SIZES = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' } as const

/**
 * Étoiles de notation (1-5).
 * - readOnly : affichage (profil, cartes) avec demi-étoile via dégradé
 * - interactif : boutons radio accessibles (clavier ←/→ natif via radiogroup)
 */
export function RatingStars({ value, onChange, size = 'md', readOnly, label }: RatingStarsProps) {
  const [hover, setHover] = useState(0)

  if (readOnly || !onChange) {
    const rounded = Math.round(value * 2) / 2
    return (
      <span
        className="inline-flex items-center gap-0.5"
        role="img"
        aria-label={`Note : ${value.toFixed(1)} sur 5`}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            aria-hidden
            className={cn(
              SIZES[size],
              i <= Math.floor(rounded)
                ? 'fill-amber-400 text-amber-400'
                : i - 0.5 === rounded
                  ? 'fill-amber-400/50 text-amber-400'
                  : 'text-fg-muted/40',
            )}
          />
        ))}
      </span>
    )
  }

  const active = hover || value
  return (
    <div role="radiogroup" aria-label={label ?? 'Note de 1 à 5 étoiles'} className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(i)}
          className="min-h-11 min-w-11 p-2"
        >
          <Star
            aria-hidden
            className={cn(
              SIZES[size],
              i <= active ? 'fill-amber-400 text-amber-400' : 'text-fg-muted/40',
            )}
          />
        </button>
      ))}
    </div>
  )
}
