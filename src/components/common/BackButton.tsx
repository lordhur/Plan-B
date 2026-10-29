'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

/**
 * Bouton retour : revient à l'écran PRÉCÉDENT (historique du navigateur) et non
 * à une page fixe. Si l'historique est vide (lien direct, PWA fraîchement
 * ouverte), on retombe sur `fallback`.
 */
export function BackButton({
  fallback = '/',
  label = 'Retour',
  className,
}: {
  fallback?: string
  label?: string
  className?: string
}) {
  const router = useRouter()

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back()
        } else {
          router.push(fallback)
        }
      }}
      className={
        className ??
        'inline-flex h-11 w-11 items-center justify-center rounded-full text-fg transition-colors hover:bg-bg-secondary active:scale-95'
      }
    >
      <ArrowLeft className="h-5 w-5" aria-hidden />
    </button>
  )
}
