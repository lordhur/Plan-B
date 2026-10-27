'use client'

import { Heart } from 'lucide-react'
import * as React from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { cn } from '@/lib/utils'

interface LikeButtonProps {
  eventId: string
  liked: boolean
  count: number
  className?: string
}

/**
 * Bouton like (cœur) — montrer son intérêt pour un plan sans s'inscrire.
 * Optimiste : l'état bascule immédiatement, puis l'API confirme.
 */
export function LikeButton({ eventId, liked, count, className }: LikeButtonProps) {
  const { isAuthenticated } = useCurrentUser()
  const [localLiked, setLocalLiked] = React.useState(liked)
  const [localCount, setLocalCount] = React.useState(count)

  React.useEffect(() => {
    setLocalLiked(liked)
    setLocalCount(count)
  }, [liked, count])

  const utils = trpc.useUtils()
  const toggle = trpc.events.toggleLike.useMutation({
    onSuccess: (r) => {
      setLocalLiked(r.liked)
      setLocalCount(r.count)
      void utils.events.invalidate()
    },
  })

  return (
    <button
      type="button"
      aria-pressed={localLiked}
      aria-label={localLiked ? 'Retirer mon like' : 'J’aime ce plan'}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!isAuthenticated || toggle.isPending) return
        // Optimiste
        setLocalLiked((v) => !v)
        setLocalCount((c) => c + (localLiked ? -1 : 1))
        toggle.mutate({ eventId })
      }}
      className={cn(
        'inline-flex h-9 min-h-9 items-center gap-1 rounded-full border border-border bg-card px-2.5 text-sm font-bold transition-all hover:border-danger-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600',
        localLiked && 'border-danger-400 bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400',
        className,
      )}
    >
      <Heart
        className={cn('h-4 w-4 transition-all', localLiked && 'scale-110 fill-current')}
        aria-hidden
      />
      <span className="tabular-nums">{localCount}</span>
    </button>
  )
}
