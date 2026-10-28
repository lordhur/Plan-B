'use client'

import { Loader2, Search, Sparkles, Sticker, X } from 'lucide-react'
import * as React from 'react'
import {
  GIF_CATEGORIES,
  fetchGifs,
  type CombinedGifPage,
  type GifItem,
  type GifKind,
  type GifProvider,
} from '@/lib/gifs'
import { cn } from '@/lib/utils'

const STICKER_EMOJIS = ['😀', '😂', '😍', '🥳', '😎', '🤗', '👍', '🙏', '👏', '🔥', '❤️', '🎉', '😅', '🤔', '😴', '💪', '🍕', '⚽', '🎸', '🌞']

interface GifPickerProps {
  onPick: (url: string | null, text?: string) => void
  onClose: () => void
}

const PROVIDERS: { id: 'all' | GifProvider; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'tenor', label: 'Tenor' },
  { id: 'giphy', label: 'Giphy' },
]

/**
 * Sélecteur GIF & stickers multi-fournisseurs (Tenor + Giphy).
 * Deux onglets (GIF / Stickers), catégories, recherche, pagination et
 * repli sur une grille d'émojis si les deux API sont injoignables.
 */
export function GifPicker({ onPick, onClose }: GifPickerProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [kind, setKind] = React.useState<GifKind>('gif')
  const [provider, setProvider] = React.useState<'all' | GifProvider>('all')
  const [query, setQuery] = React.useState('')
  const [debounced, setDebounced] = React.useState('')
  const [items, setItems] = React.useState<GifItem[]>([])
  const [cursors, setCursors] = React.useState<CombinedGifPage['cursors']>({})
  const [hasMore, setHasMore] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [failed, setFailed] = React.useState<GifProvider[]>([])
  const [category, setCategory] = React.useState<string>('reactions')

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

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 380)
    return () => window.clearTimeout(t)
  }, [query])

  const effectiveQuery = debounced || (GIF_CATEGORIES.find((c) => c.id === category)?.query ?? '')

  React.useEffect(() => {
    const ctrl = new AbortController()
    let alive = true
    setLoading(true)
    setItems([])
    fetchGifs({
      kind,
      query: effectiveQuery,
      providers: provider === 'all' ? undefined : [provider],
      signal: ctrl.signal,
    })
      .then((page) => {
        if (!alive) return
        setItems(page.items)
        setCursors(page.cursors)
        setHasMore(page.hasMore)
        setFailed(page.failed)
      })
      .catch(() => {
        if (alive) setFailed(['tenor', 'giphy'])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
      ctrl.abort()
    }
  }, [kind, effectiveQuery, provider])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const page = await fetchGifs({
        kind,
        query: effectiveQuery,
        providers: provider === 'all' ? undefined : [provider],
        cursors,
      })
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id))
        return [...prev, ...page.items.filter((i) => !seen.has(i.id))]
      })
      setCursors(page.cursors)
      setHasMore(page.hasMore)
    } catch {
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }

  const nothing = !loading && items.length === 0

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="GIF et stickers"
      className="absolute bottom-full left-0 right-0 z-30 mb-2 flex h-[min(72vh,27rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
    >
      {/* En-tête : recherche + fermeture */}
      <div className="flex items-center gap-1.5 border-b border-border p-2">
        <Search className="h-4 w-4 shrink-0 text-fg-muted" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={kind === 'gif' ? 'Rechercher un GIF…' : 'Rechercher un sticker…'}
          aria-label={kind === 'gif' ? 'Rechercher un GIF' : 'Rechercher un sticker'}
          className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-muted"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer les GIF et stickers"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted hover:bg-bg-secondary"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {/* Onglets GIF / Stickers */}
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        {([
          { id: 'gif' as GifKind, label: 'GIF', icon: Sparkles },
          { id: 'sticker' as GifKind, label: 'Stickers', icon: Sticker },
        ]).map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={kind === tab.id}
            onClick={() => setKind(tab.id)}
            className={cn(
              'inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-colors',
              kind === tab.id ? 'bg-primary-600 text-white' : 'text-fg-muted hover:bg-bg-secondary',
            )}
          >
            <tab.icon className="h-3.5 w-3.5" aria-hidden />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Fournisseurs */}
      <div className="flex items-center gap-1 px-2 py-1.5">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-fg-muted">Source</span>
        {PROVIDERS.map((p) => {
          const down = p.id !== 'all' && failed.includes(p.id)
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={provider === p.id}
              onClick={() => setProvider(p.id)}
              title={down ? `${p.label} indisponible` : undefined}
              className={cn(
                'min-h-7 rounded-full border px-2.5 text-[11px] font-bold transition-colors',
                provider === p.id
                  ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-200'
                  : 'border-border text-fg-muted hover:border-primary-300',
                down && 'opacity-50',
              )}
            >
              {p.label}
              {down ? ' ⚠' : ''}
            </button>
          )
        })}
      </div>

      {/* Catégories (masquées pendant une recherche) */}
      {!query.trim() && (
        <div className="flex gap-1 overflow-x-auto border-y border-border px-2 py-1.5 no-scrollbar">
          {GIF_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
                category === c.id
                  ? 'bg-fg text-bg'
                  : 'bg-bg-secondary text-fg-muted hover:text-fg',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Résultats */}
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Chargement des {kind === 'gif' ? 'GIF' : 'stickers'}…
          </div>
        ) : nothing ? (
          <div className="space-y-2 p-1">
            <p className="text-center text-xs font-medium text-fg-muted">
              {failed.length === 2
                ? 'Tenor et Giphy sont injoignables — voici des stickers en attendant.'
                : 'Aucun résultat pour cette recherche.'}
            </p>
            <div className="grid grid-cols-7 gap-1">
              {STICKER_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => onPick(null, e)}
                  className="flex h-10 items-center justify-center rounded-lg text-2xl hover:bg-bg-secondary"
                  aria-label={`Envoyer le sticker ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPick(item.full)}
                  className="group relative overflow-hidden rounded-lg bg-bg-secondary"
                  aria-label={`Envoyer ce ${item.kind === 'sticker' ? 'sticker' : 'GIF'} (${item.provider})`}
                  title={item.title}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.preview}
                    alt=""
                    loading="lazy"
                    className="h-24 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[9px] font-bold uppercase text-white">
                    {item.provider === 'tenor' ? 'T' : 'G'}
                  </span>
                </button>
              ))}
            </div>
            {hasMore && (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="mx-auto mt-2 flex min-h-9 items-center gap-1.5 rounded-full border border-border px-4 text-xs font-bold text-fg-muted hover:border-primary-300 hover:text-fg disabled:opacity-60"
              >
                {loadingMore && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
                Charger plus
              </button>
            )}
          </>
        )}
      </div>

      <p className="border-t border-border px-2 py-1 text-center text-[10px] text-fg-muted">
        GIF & stickers — Tenor & Giphy
        {failed.length === 1 ? ` · ${failed[0] === 'tenor' ? 'Tenor' : 'Giphy'} indisponible` : ''}
      </p>
    </div>
  )
}
