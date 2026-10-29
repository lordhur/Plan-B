'use client'

import * as React from 'react'

import { gifSrc, isGifProviderUrl } from '@/lib/gifs'
import { cn } from '@/lib/utils'

/**
 * Affiche un GIF/sticker Tenor ou Giphy.
 *
 * Le proxy `/api/gifs/img` est utilisé en priorité : il contourne les
 * bloqueurs de publicité (très répandus) et le suivi des fournisseurs.
 * Si le proxy échoue pour une raison quelconque, on retombe automatiquement
 * sur l'URL d'origine — l'image ne doit jamais rester cassée.
 */
export function GifImage({
  src,
  alt = '',
  className,
  loading = 'lazy',
  onClick,
}: {
  src: string
  alt?: string
  className?: string
  loading?: 'lazy' | 'eager'
  onClick?: () => void
}) {
  const proxied = React.useMemo(() => gifSrc(src), [src])
  const isRemote = isGifProviderUrl(src)
  const [current, setCurrent] = React.useState(proxied)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    setCurrent(proxied)
    setFailed(false)
  }, [proxied])

  if (failed) {
    return (
      <span
        aria-hidden
        className={cn(
          'flex items-center justify-center bg-bg-secondary text-[10px] text-fg-muted',
          className,
        )}
      >
        GIF
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onClick={onClick}
      className={className}
      onError={() => {
        // 1er échec : on tente l'URL directe du fournisseur.
        if (isRemote && current !== src) {
          setCurrent(src)
          return
        }
        setFailed(true)
      }}
    />
  )
}
