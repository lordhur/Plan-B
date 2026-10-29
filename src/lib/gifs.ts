/**
 * Client GIF / stickers — passe par notre proxy `/api/gifs`.
 *
 * Aucun appel direct à Tenor ou Giphy depuis le navigateur : les bloqueurs de
 * publicité, CORS et les clés sont gérés côté serveur (voir `src/server/gifs.ts`).
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

export interface CombinedGifPage {
  items: GifItem[]
  /** Curseurs de pagination par fournisseur. */
  cursors: Partial<Record<GifProvider, string | null>>
  /** Vrai s'il reste des résultats à charger. */
  hasMore: boolean
  /** Fournisseurs qui ont répondu. */
  ok: GifProvider[]
  /** Fournisseurs en échec (clé absente, réseau, quota…). */
  failed: GifProvider[]
  /** Messages techniques courts, pour le panneau « Détails ». */
  errors: Partial<Record<GifProvider, string>>
  /** Tenor directement utilisable (clé Google configurée). */
  tenorConfigured: boolean
}

/** True si l'URL pointe vers un média Tenor ou Giphy. */
export function isGifProviderUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return /^https:\/\/([a-z0-9-]+\.)*(tenor|giphy)\.com\//i.test(url)
}

/**
 * URL à utiliser dans une balise <img> : les médias Tenor/Giphy passent par
 * notre proxy (les bloqueurs de publicité bloquent leurs domaines).
 */
export function gifSrc(url: string): string {
  return isGifProviderUrl(url) ? `/api/gifs/img?u=${encodeURIComponent(url)}` : url
}

const EMPTY: CombinedGifPage = {
  items: [],
  cursors: {},
  hasMore: false,
  ok: [],
  failed: [],
  errors: {},
  tenorConfigured: false,
}

/**
 * Récupère une page de GIF ou de stickers.
 * `cursors` provient de la page précédente (`undefined` pour la première page).
 */
export async function fetchGifs(opts: {
  kind: GifKind
  query: string
  providers?: GifProvider[]
  cursors?: Partial<Record<GifProvider, string | null>>
  limit?: number
  signal?: AbortSignal
}): Promise<CombinedGifPage> {
  const params = new URLSearchParams({
    kind: opts.kind,
    q: opts.query,
    limit: String(opts.limit ?? 24),
  })
  if (opts.providers && opts.providers.length === 1) params.set('provider', opts.providers[0]!)
  if (opts.cursors?.tenor) params.set('pos', String(opts.cursors.tenor))
  if (opts.cursors?.giphy) params.set('offset', String(opts.cursors.giphy))

  const res = await fetch(`/api/gifs?${params.toString()}`, {
    signal: opts.signal,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Proxy GIF ${res.status}`)
  const data = (await res.json()) as Partial<CombinedGifPage>
  return { ...EMPTY, ...data }
}
