import * as React from 'react'
import { cn } from '@/lib/utils'

/** Couleurs d'avatar déterministes à partir du nom. */
const AVATAR_COLORS = [
  'bg-primary-500',
  'bg-secondary-500',
  'bg-accent-500',
  'bg-success-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-rose-500',
]

function colorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!
}

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

/** Avatar avec initiales colorées en repli (pas de dépendance externe). */
export function Avatar({ src, name, size = 'md', className, ...props }: AvatarProps) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-24 w-24 text-3xl' }
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizes[size], className)}
        {...props}
      />
    )
  }

  return (
    <div
      role="img"
      aria-label={name}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold text-white select-none',
        sizes[size],
        colorFromName(name),
        className,
      )}
      {...props}
    >
      {initials || '?'}
    </div>
  )
}
