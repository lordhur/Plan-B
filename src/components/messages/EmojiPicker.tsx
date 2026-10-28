'use client'

import { Clock3, Search, X } from 'lucide-react'
import * as React from 'react'
import {
  EMOJI_CATEGORIES,
  allEmojis,
  emojiCount,
  searchEmojis,
} from '@/lib/emojiData'
import { cn } from '@/lib/utils'

interface EmojiPickerProps {
  onPick: (emoji: string) => void
  onClose: () => void
}

const RECENT_KEY = 'planb_emoji_recent'

function loadRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY)
    const parsed = raw ? (JSON.parse(raw) as string[]) : []
    return Array.isArray(parsed) ? parsed.slice(0, 24) : []
  } catch {
    return []
  }
}

/**
 * Sélecteur d'émojis COMPLET : toutes les émotes Unicode (≈ 2 400) avec
 * un menu de catégories VERTICAL sur le côté (demande produit), une recherche
 * par mots-clés français et les derniers émojis utilisés.
 */
export function EmojiPicker({ onPick, onClose }: EmojiPickerProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState<'all' | 'recent' | string>('all')
  const [recent, setRecent] = React.useState<string[]>([])
  const [count, setCount] = React.useState(0)

  React.useEffect(() => {
    setRecent(loadRecent())
    try {
      setCount(emojiCount())
    } catch {
      setCount(0)
    }
  }, [])

  React.useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [onClose])

  const pick = (emoji: string) => {
    onPick(emoji)
    setRecent((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 24)
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        /* stockage indisponible */
      }
      return next
    })
  }

  const results = React.useMemo(() => (query.trim() ? searchEmojis(query) : []), [query])
  const grouped = React.useMemo(() => allEmojis(), [])

  const sections = React.useMemo(() => {
    if (query.trim()) return [{ id: 'search', label: `Résultats (${results.length})`, list: results }]
    if (active === 'recent') return [{ id: 'recent', label: 'Récents', list: recent }]
    const ids = active === 'all' ? EMOJI_CATEGORIES.map((c) => c.id) : [active]
    return ids
      .map((id) => ({
        id,
        label: EMOJI_CATEGORIES.find((c) => c.id === id)?.label ?? id,
        list: grouped[id] ?? [],
      }))
      .filter((s) => s.list.length > 0)
  }, [active, grouped, query, recent, results])

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Choisir un émoji"
      className="absolute bottom-full left-0 z-40 mb-2 flex h-[min(72vh,26rem)] w-[min(94vw,23rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
    >
      {/* Recherche */}
      <div className="flex items-center gap-1.5 border-b border-border p-2">
        <Search className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un émoji…"
          aria-label="Rechercher un émoji"
          className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-muted"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer les émojis"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:bg-bg-secondary"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Menu des catégories — VERTICAL (jamais de défilement horizontal) */}
        <div
          role="tablist"
          aria-label="Catégories d’émojis"
          aria-orientation="vertical"
          className="flex w-12 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border p-1 no-scrollbar"
        >
          <button
            type="button"
            role="tab"
            aria-selected={active === 'recent'}
            title="Récents"
            onClick={() => {
              setQuery('')
              setActive('recent')
            }}
            className={cn(
              'flex h-9 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
              active === 'recent' ? 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-200' : 'text-fg-muted hover:bg-bg-secondary',
            )}
          >
            <Clock3 className="h-4 w-4" aria-hidden />
            <span className="sr-only">Récents</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={active === 'all'}
            title="Tous les émojis"
            onClick={() => {
              setQuery('')
              setActive('all')
            }}
            className={cn(
              'flex h-9 w-10 shrink-0 items-center justify-center rounded-lg text-base font-black transition-colors',
              active === 'all' ? 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-200' : 'text-fg-muted hover:bg-bg-secondary',
            )}
          >
            ↔
            <span className="sr-only">Tous</span>
          </button>
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={active === cat.id}
              title={cat.label}
              onClick={() => {
                setQuery('')
                setActive(cat.id)
                if (scrollRef.current) scrollRef.current.scrollTop = 0
              }}
              className={cn(
                'flex h-9 w-10 shrink-0 items-center justify-center rounded-lg text-lg leading-none transition-colors',
                active === cat.id ? 'bg-primary-100 dark:bg-primary-950' : 'hover:bg-bg-secondary',
              )}
            >
              <span aria-hidden>{cat.icon}</span>
              <span className="sr-only">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Grille */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {sections.length === 0 && (
            <p className="p-4 text-center text-xs text-fg-muted">
              {active === 'recent' ? 'Aucun émoji récent pour le moment.' : 'Aucun émoji trouvé.'}
            </p>
          )}
          {sections.map((section) => (
            <section key={section.id} className="mb-1.5">
              <h3 className="sticky top-0 z-10 bg-card/95 px-1 py-1 text-[11px] font-bold uppercase tracking-wide text-fg-muted backdrop-blur">
                {section.label}
              </h3>
              <div className="grid grid-cols-7 gap-0.5">
                {section.list.map((emoji) => (
                  <button
                    key={`${section.id}-${emoji}`}
                    type="button"
                    onClick={() => pick(emoji)}
                    aria-label={`Insérer ${emoji}`}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-xl leading-none transition-colors hover:bg-bg-secondary focus-visible:bg-bg-secondary"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <p className="border-t border-border px-2 py-1.5 text-center text-[10px] font-medium text-fg-muted">
        {count > 0 ? `${count.toLocaleString('fr-FR')} émojis disponibles` : 'Émojis Unicode'}
      </p>
    </div>
  )
}
