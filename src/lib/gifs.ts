/**
 * Fournisseurs GIF / stickers : Tenor (Google) **et** Giphy.
 *
 * Les requêtes partent du navigateur (comme avant) : aucune clé n'est exposée
 * côté serveur puisqu'elles sont publiques par nature. On peut surcharger les
 * clés via `NEXT_PUBLIC_TENOR_API_KEY` / `NEXT_PUBLIC_GIPHY_API_KEY`.
 */

export type GifProvider = 'tenor' | 'giphy'
export type GifKind = 'gif' | 'sticker'

export interface GifItem {
  id: string
  provider: GifProvider
  /** Vignette (petit fichier). */
  preview: string
  /** Fichier envoyé dans le message. */
  full: string
  width: number
  height: number
  title: string
  kind: GifKind
}

export interface GifPage {
  items: GifItem[]
  /** Curseur de pagination propre au fournisseur. */
  next: string | null
}

const TENOR_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY || 'LIVDSRZULELA'
const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || 'dc6zaTOxFJmzC'

/** Catégories proposées (libellés FR, requêtes indexées en anglais). */
export const GIF_CATEGORIES: { id: string; label: string; query: string }[] = [
  { id: 'reactions', label: 'Réactions', query: 'reaction' },
  { id: 'laugh', label: 'Rire', query: 'laughing' },
  { id: 'love', label: 'Amour', query: 'love' },
  { id: 'hello', label: 'Salut', query: 'hello wave' },
  { id: 'party', label: 'Fête', query: 'party celebration' },
  { id: 'animals', label: 'Animaux', query: 'cute animals' },
  { id: 'sport', label: 'Sport', query: 'sport' },
  { id: 'food', label: 'Food', query: 'food' },
  { id: 'film', label: 'Film', query: 'movie' },
  { id: 'anime', label: 'Anime', query: 'anime' },
  { id: 'dance', label: 'Danse', query: 'dance' },
  { id: 'sad', label: 'Triste', query: 'sad cry' },
]

interface TenorFormat {
  url?: string
  dims?: number[]
}

interface TenorResult {
  id?: string
  content_description?: string
  media_formats?: Record<string, TenorFormat>
}

interface TenorResponse {
  results?: TenorResult[]
  next?: string
}

function firstUrl(formats: Record<string, TenorFormat>, keys: string[]): string {
  for (const key of keys) {
    const url = formats[key]?.url
    if (url) return url
  }
  return ''
}

/** Recherche Tenor (GIF ou stickers, tendances si la requête est vide). */
export async function fetchTenor(opts: {
  kind: GifKind
  query: string
  pos?: string | null
  limit?: number
  signal?: AbortSignal
}): Promise<GifPage> {
  const limit = opts.limit ?? 24
  const params = new URLSearchParams({
    key: TENOR_KEY,
    client_key: 'planb_web',
    limit: String(limit),
    media_filter: 'tinygif,gif,webp',
    contentfilter: 'high',
    locale: 'fr_FR',
    country: 'FR',
  })
  if (opts.kind === 'sticker') params.set('searchfilter', 'sticker')
  if (opts.pos) params.set('pos', opts.pos)
  if (opts.query.trim()) {
    params.set('q', opts.query.trim())
    // « searchfilter=sticker » restreint aux stickers ; on ne filtre pas les GIF.
    if (opts.kind === 'sticker') params.set('searchfilter', 'sticker')
  }

  const endpoint = opts.query.trim() ? 'search' : 'featured'
  const res = await fetch(`https://tenor.googleapis.com/v2/${endpoint}?${params.toString()}`, {
    signal: opts.signal,
  })
  if (!res.ok) throw new Error(`Tenor ${res.status}`)
  const data = (await res.json()) as TenorResponse

  const items: GifItem[] = (data.results ?? [])
    .map((g) => {
      const formats = g.media_formats ?? {}
      const preview = firstUrl(formats, ['tinygif', 'nanogif', 'gif', 'webp'])
      const full = firstUrl(formats, ['gif', 'mediumgif', 'webp', 'tinygif'])
      const dims = formats.gif?.dims ?? formats.tinygif?.dims ?? [1, 1]
      return {
        id: `tenor-${g.id ?? preview}`,
        provider: 'tenor' as const,
        preview,
        full,
        width: dims[0] ?? 1,
        height: dims[1] ?? 1,
        title: g.content_description ?? 'GIF Tenor',
        kind: opts.kind,
      }
    })
    .filter((g) => g.preview && g.full)

  return { items, next: data.next ?? null }
}

interface GiphyImage {
  url?: string
  width?: string
  height?: string
}

interface GiphyResult {
  id?: string
  title?: string
  images?: Record<string, GiphyImage>
}

interface GiphyResponse {
  data?: GiphyResult[]
  pagination?: { total_count?: number; count?: number; offset?: number }
}

/** Recherche Giphy (GIF ou stickers, tendances si la requête est vide). */
export async function fetchGiphy(opts: {
  kind: GifKind
  query: string
  offset?: number
  limit?: number
  signal?: AbortSignal
}): Promise<GifPage> {
  const limit = opts.limit ?? 24
  const offset = opts.offset ?? 0
  const base = opts.kind === 'sticker' ? 'stickers' : 'gifs'
  const action = opts.query.trim() ? 'search' : 'trending'
  const params = new URLSearchParams({
    api_key: GIPHY_KEY,
    limit: String(limit),
    offset: String(offset),
    rating: 'pg',
  })
  if (opts.query.trim()) {
    params.set('q', opts.query.trim())
    params.set('lang', 'fr')
  }

  const res = await fetch(`https://api.giphy.com/v1/${base}/${action}?${params.toString()}`, {
    signal: opts.signal,
  })
  if (!res.ok) throw new Error(`Giphy ${res.status}`)
  const data = (await res.json()) as GiphyResponse

  const items: GifItem[] = (data.data ?? [])
    .map((g) => {
      const images = g.images ?? {}
      const preview = images.fixed_width?.url ?? images.downsized?.url ?? images.original?.url ?? ''
      const full = images.original?.url ?? images.downsized_medium?.url ?? preview
      return {
        id: `giphy-${g.id ?? preview}`,
        provider: 'giphy' as const,
        preview,
        full,
        width: Number(images.fixed_width?.width ?? 200),
        height: Number(images.fixed_width?.height ?? 200),
        title: g.title ?? 'GIF Giphy',
        kind: opts.kind,
      }
    })
    .filter((g) => g.preview && g.full)

  const total = data.pagination?.total_count ?? 0
  const count = data.pagination?.count ?? items.length
  const nextOffset = offset + count
  return { items, next: count > 0 && nextOffset < total ? String(nextOffset) : null }
}

export interface CombinedGifPage {
  items: GifItem[]
  /** Curseur de pagination pour chaque fournisseur. */
  cursors: Partial<Record<GifProvider, string | null>>
  /** Vrai s'il reste des résultats à charger. */
  hasMore: boolean
  /** Fournisseurs qui ont répondu correctement. */
  ok: GifProvider[]
  /** Fournisseurs en erreur (clé absente, réseau, quota…). */
  failed: GifProvider[]
}

/**
 * Interroge Tenor et Giphy en parallèle puis alterne les résultats pour que
 * les deux styles de GIF/stickers soient toujours représentés.
 */
export async function fetchGifs(opts: {
  kind: GifKind
  query: string
  providers?: GifProvider[]
  /** Curseurs de la page précédente, un par fournisseur. */
  cursors?: Partial<Record<GifProvider, string | null>>
  limit?: number
  signal?: AbortSignal
}): Promise<CombinedGifPage> {
  const active = opts.providers && opts.providers.length > 0 ? opts.providers : (['tenor', 'giphy'] as GifProvider[])
  const tasks = active.map(async (provider) => {
    try {
      const page =
        provider === 'tenor'
          ? await fetchTenor({ ...opts, pos: opts.cursors?.tenor ?? null })
          : await fetchGiphy({ ...opts, offset: Number(opts.cursors?.giphy ?? 0) })
      return { provider, page }
    } catch {
      return { provider, page: null as GifPage | null }
    }
  })

  const settled = await Promise.all(tasks)
  const ok: GifProvider[] = []
  const failed: GifProvider[] = []
  const pages: Record<string, GifPage> = {}
  for (const s of settled) {
    if (s.page && s.page.items.length > 0) {
      ok.push(s.provider)
      pages[s.provider] = s.page
    } else if (s.page) {
      ok.push(s.provider)
      pages[s.provider] = s.page
    } else {
      failed.push(s.provider)
    }
  }

  // Alternance Tenor / Giphy pour un mélange équilibré.
  const items: GifItem[] = []
  const max = Math.max(...Object.values(pages).map((p) => p.items.length), 0)
  for (let i = 0; i < max; i++) {
    for (const provider of ['tenor', 'giphy'] as GifProvider[]) {
      const item = pages[provider]?.items[i]
      if (item) items.push(item)
    }
  }

  const cursors: Partial<Record<GifProvider, string | null>> = {
    tenor: pages.tenor?.next ?? null,
    giphy: pages.giphy?.next ?? null,
  }

  return {
    items,
    cursors,
    hasMore: Object.values(cursors).some((c) => !!c),
    ok,
    failed,
  }
}
