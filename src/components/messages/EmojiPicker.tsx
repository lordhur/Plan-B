'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/** Petites collections thématiques — suffisant pour une messagerie entre amis. */
const GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Smileys',
    emojis: ['😀', '😄', '😅', '😂', '🤣', '😊', '😍', '🥰', '😘', '😜', '🤗', '🤔', '😎', '🥳', '😴', '😢', '😭', '😡', '🤯', '🥺'],
  },
  {
    label: 'Gestes',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤙', '👋', '🙏', '💪', '👏', '🤝', '☝️', '🫶', '👊'],
  },
  {
    label: 'Cœurs',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💕', '💖', '💘', '💝', '💔'],
  },
  {
    label: 'Sorties',
    emojis: ['🎉', '🎊', '🥂', '🍻', '🍷', '🍕', '🍔', '🍰', '☕', '🎂', '🎁', '🎈', '🎵', '🎬', '🎲', '🏆'],
  },
  {
    label: 'Activités',
    emojis: ['⚽', '🏀', '🎾', '🏐', '🚴', '🏃', '🧗', '🏊', '⛷️', '🎿', '🥾', '⛺', '🎣', '📸', '🎨', '🧘'],
  },
  {
    label: 'Nature & objets',
    emojis: ['☀️', '🌙', '⭐', '🌈', '🌊', '🏖️', '⛰️', '🌲', '🔥', '❄️', '🚗', '🚆', '✈️', '🏠', '⏰', '📍'],
  },
]

interface EmojiPickerProps {
  onPick: (emoji: string) => void
  onClose: () => void
}

/** Sélecteur d'émojis léger — grille par thèmes, sans dépendance externe. */
export function EmojiPicker({ onPick, onClose }: EmojiPickerProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [group, setGroup] = React.useState(0)

  React.useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Choisir un émoji"
      className="absolute bottom-full left-0 z-40 mb-2 w-72 rounded-2xl border border-border bg-card p-2 shadow-card-hover"
    >
      <div className="mb-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar" role="tablist" aria-label="Thèmes">
        {GROUPS.map((g, i) => (
          <button
            key={g.label}
            type="button"
            role="tab"
            aria-selected={group === i}
            title={g.label}
            onClick={() => setGroup(i)}
            className={cn(
              'shrink-0 rounded-lg px-2 py-1 text-xs font-semibold transition-colors',
              group === i
                ? 'bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-200'
                : 'text-fg-muted hover:bg-bg-secondary',
            )}
          >
            {g.emojis[0] ?? '🙂'} {g.label}
          </button>
        ))}
      </div>
      <div className="grid max-h-44 grid-cols-8 gap-0.5 overflow-y-auto" role="tabpanel">
        {(GROUPS[group]?.emojis ?? []).map((em) => (
          <button
            key={em}
            type="button"
            onClick={() => {
              onPick(em)
              onClose()
            }}
            aria-label={`Insérer ${em}`}
            className="flex h-9 w-full items-center justify-center rounded-lg text-xl transition-transform hover:scale-125 hover:bg-bg-secondary"
          >
            {em}
          </button>
        ))}
      </div>
    </div>
  )
}

