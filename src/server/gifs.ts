/**
 * Passerelle GIF / stickers — Tenor (Google) et Giphy.
 *
 * Pourquoi un proxy côté serveur ?
 *  1. Les appels directs depuis le navigateur sont bloqués par les bloqueurs
 *     de publicité et par la politique CORS de certains fournisseurs.
 *  2. Les clés « publiques » historiques sont tantôt refusées, tantôt limitées :
 *     on essaie plusieurs points d'entrée et plusieurs clés à la suite.
 *  3. Les réponses sont mises en cache (CDN + mémoire) → rapide et résilient.
 *
 * Ordre Tentor : clé officielle v2 → API v1 anonyme (search) → v1 (trending).
 * Ordre Giphy : clé officielle → clés publiques connues.
 */

export type GifProvider = 'tenor' | 'giphy'
export type GifKind = 'gif' | 'sticker'

export interface GifItem {
  id: string
  provider: GifProvider
  preview: string
  full: string
  width: number
  height: number
  title: string
  kind: GifKind
}

export interface ProviderOutcome {
  provider: GifProvider
  items: GifItem[]
  /** Curseur de pagination (position Tenor / offset Giphy). */
  cursor: string | null
  /** Message technique court si le fournisseur a échoué. */
  error?: string
}

const TENOR_V2_KEY = process.env.TENOR_API_KEY || process.env.NEXT_PUBLIC_TENOR_API_KEY || ''

/**
 * Clés Giphy. Les clés « beta » historiques (dc6zaTOxFJmzC…) ont été BANNIES
 * par Giphy (403) : on place en tête la clé publique encore valide, puis la
 * variable d'environnement officielle si elle est fournie.
 */
const GIPHY_KEYS = [
  process.env.GIPHY_API_KEY,
  process.env.NEXT_PUBLIC_GIPHY_API_KEY,
  'Gc7131jiJuvI7IdN0HZ1D7nh0ow5BU6g',
  'dc6zaTOxFJmzC',
].filter((k): k is string => !!k && k.length > 8)

/** Tenor : l'API v1 est définitivement arrêtée — seule la v2 (clé Google) fonctionne. */
export function isTenorConfigured(): boolean {
  return TENOR_V2_KEY.length > 8
}

const TIMEOUT_MS = 6500

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      Accept: 'application/json',
      // Certains CDN refusent les requêtes sans User-Agent identifiable.
      'User-Agent': 'PlanB/1.0 (+https://planb-lord-hur-tv.vercel.app)',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

interface TenorV2Response {
  results?: {
    id?: string
    content_description?: string
    media_formats?: Record<string, { url?: string; dims?: number[] }>
  }[]
  next?: string
}

function cleanTitle(input: string | undefined, fallback: string): string {
  const t = (input ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return fallback
  return t.length > 90 ? `${t.slice(0, 87)}…` : t
}

/** Tenor v2 — nécessite une vraie clé Google Cloud. */
async function tenorV2(
  key: string,
  kind: GifKind,
  query: string,
  pos: string | null,
  limit: number,
): Promise<{ items: GifItem[]; cursor: string | null }> {
  const params = new URLSearchParams({
    key,
    client_key: 'planb_web',
    limit: String(limit),
    media_filter: 'tinygif,mediumgif,gif',
    contentfilter: 'high',
    locale: 'fr_FR',
    country: 'FR',
  })
  if (pos) params.set('pos', pos)
  if (query) {
    params.set('q', query)
    if (kind === 'sticker') params.set('searchfilter', 'sticker')
  }
  const endpoint = query ? 'search' : 'featured'
  const data = (await getJson(`https://tenor.googleapis.com/v2/${endpoint}?${params}`)) as TenorV2Response

  const items: GifItem[] = (data.results ?? [])
    .map((g) => {
      const formats = g.media_formats ?? {}
      const preview = formats.tinygif?.url ?? formats.gif?.url ?? ''
      const full = formats.mediumgif?.url ?? formats.gif?.url ?? formats.tinygif?.url ?? ''
      const dims = formats.gif?.dims ?? formats.tinygif?.dims ?? [1, 1]
      return {
        id: `tenor-${g.id ?? preview}`,
        provider: 'tenor' as const,
        preview,
        full,
        width: dims[0] ?? 1,
        height: dims[1] ?? 1,
        title: cleanTitle(g.content_description, 'GIF Tenor'),
        kind,
      }
    })
    .filter((g) => g.preview && g.full)

  return { items, cursor: data.next ?? null }
}

/** Giphy v1 — GIF ou stickers, recherche ou tendances. */
async function giphy(
  key: string,
  kind: GifKind,
  query: string,
  offset: number,
  limit: number,
): Promise<{ items: GifItem[]; cursor: string | null }> {
  const base = kind === 'sticker' ? 'stickers' : 'gifs'
  const action = query ? 'search' : 'trending'
  const params = new URLSearchParams({
    api_key: key,
    limit: String(limit),
    offset: String(offset),
    rating: 'pg',
  })
  if (query) {
    params.set('q', query)
    params.set('lang', 'fr')
  }
  const data = (await getJson(`https://api.giphy.com/v1/${base}/${action}?${params}`)) as {
    data?: { id?: string; title?: string; images?: Record<string, { url?: string; width?: string; height?: string }> }[]
    pagination?: { total_count?: number; count?: number; offset?: number }
  }

  const items: GifItem[] = (data.data ?? [])
    .map((g) => {
      const images = g.images ?? {}
      const preview =
        images.fixed_width_downsampled?.url ??
        images.fixed_width?.url ??
        images.downsized?.url ??
        images.original?.url ??
        ''
      // Le fichier envoyé reste léger : 480 px plutôt que l'original (parfois 3 Mo).
      const full =
        images.downsized_medium?.url ??
        images.fixed_width?.url ??
        images.original?.url ??
        preview
      return {
        id: `giphy-${g.id ?? preview}`,
        provider: 'giphy' as const,
        preview,
        full,
        width: Number(images.fixed_width?.width ?? 200),
        height: Number(images.fixed_width?.height ?? 200),
        title: cleanTitle(g.title, 'GIF Giphy'),
        kind,
      }
    })
    .filter((g) => g.preview && g.full)

  const total = data.pagination?.total_count ?? 0
  const count = data.pagination?.count ?? items.length
  const next = offset + count
  return { items, cursor: count > 0 && next < total ? String(next) : null }
}

/** Cache mémoire très simple (par instance serverless) : 5 min. */
const memoryCache = new Map<string, { at: number; value: ProviderOutcome }>()
const MEMORY_TTL = 5 * 60 * 1000

function cacheGet(key: string): ProviderOutcome | null {
  const hit = memoryCache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > MEMORY_TTL) {
    memoryCache.delete(key)
    return null
  }
  return hit.value
}

function cacheSet(key: string, value: ProviderOutcome) {
  if (memoryCache.size > 300) memoryCache.clear()
  memoryCache.set(key, { at: Date.now(), value })
}

/** Essaie une chaîne de stratégies, retourne la première qui donne des résultats. */
async function firstSuccess<T>(
  strategies: { label: string; run: () => Promise<T> }[],
  isEmpty: (r: T) => boolean,
): Promise<{ value: T | null; errors: string[] }> {
  const errors: string[] = []
  for (const s of strategies) {
    try {
      const value = await s.run()
      if (!isEmpty(value)) return { value, errors }
      errors.push(`${s.label}: aucun résultat`)
    } catch (e) {
      errors.push(`${s.label}: ${e instanceof Error ? e.message : 'erreur'}`)
    }
  }
  return { value: null, errors }
}

export async function queryTenor(
  kind: GifKind,
  query: string,
  pos: string | null,
  limit: number,
): Promise<ProviderOutcome> {
  const cacheKey = `tenor|${kind}|${query}|${pos ?? ''}|${limit}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  // Sans clé Google, l'API Tenor est inaccessible (v1 arrêtée en 2025) :
  // on évite des requêtes inutiles et on le signale explicitement.
  if (!isTenorConfigured()) {
    return {
      provider: 'tenor',
      items: [],
      cursor: null,
      error: 'clé API Tenor non configurée (variable TENOR_API_KEY)',
    }
  }

  const strategies = [
    { label: 'tenor-v2', run: () => tenorV2(TENOR_V2_KEY, kind, query, pos, limit) },
  ]

  const { value, errors } = await firstSuccess(strategies, (r) => r.items.length === 0)
  const outcome: ProviderOutcome = value
    ? { provider: 'tenor', items: value.items, cursor: value.cursor }
    : { provider: 'tenor', items: [], cursor: null, error: errors.join(' · ').slice(0, 300) }

  if (outcome.items.length > 0) cacheSet(cacheKey, outcome)
  return outcome
}

export async function queryGiphy(
  kind: GifKind,
  query: string,
  offset: number,
  limit: number,
): Promise<ProviderOutcome> {
  const cacheKey = `giphy|${kind}|${query}|${offset}|${limit}`
  const cached = cacheGet(cacheKey)
  if (cached) return cached

  const strategies = GIPHY_KEYS.map((key, i) => ({
    label: `giphy-key-${i + 1}`,
    run: () => giphy(key, kind, query, offset, limit),
  }))

  const { value, errors } = await firstSuccess(strategies, (r) => r.items.length === 0)
  const outcome: ProviderOutcome = value
    ? { provider: 'giphy', items: value.items, cursor: value.cursor }
    : { provider: 'giphy', items: [], cursor: null, error: errors.join(' · ').slice(0, 300) }

  if (outcome.items.length > 0) cacheSet(cacheKey, outcome)
  return outcome
}

export interface GifsResponse {
  items: GifItem[]
  /** Curseurs par fournisseur pour la page suivante. */
  cursors: Partial<Record<GifProvider, string | null>>
  hasMore: boolean
  /** Fournisseurs ayant répondu. */
  ok: GifProvider[]
  /** Fournisseurs en échec. */
  failed: GifProvider[]
  /** Messages techniques (affichés dans « Détails »). */
  errors: Partial<Record<GifProvider, string>>
  /** Tenor est directement utilisable (clé Google configurée). */
  tenorConfigured: boolean
}

/** Interroge les fournisseurs demandés et mélange les résultats. */
export async function searchGifs(opts: {
  kind: GifKind
  query: string
  providers: GifProvider[]
  tenorPos: string | null
  giphyOffset: number
  limit: number
}): Promise<GifsResponse> {
  const { kind, query } = opts
  const limit = Math.min(48, Math.max(8, opts.limit))
  const tenorConfigured = isTenorConfigured()

  // Tenor n'est interrogé que s'il est configuré (sinon requête perdue).
  const providers = opts.providers.filter((p) => p !== 'tenor' || tenorConfigured)

  const tasks: Promise<ProviderOutcome>[] = []
  if (providers.includes('tenor')) tasks.push(queryTenor(kind, query, opts.tenorPos, limit))
  if (providers.includes('giphy')) tasks.push(queryGiphy(kind, query, opts.giphyOffset, limit))

  const settled = await Promise.all(tasks)
  const byProvider = new Map(settled.map((o) => [o.provider, o]))

  // Alternance Tenor / Giphy : les deux styles de GIF sont toujours représentés.
  const items: GifItem[] = []
  const max = Math.max(...settled.map((o) => o.items.length), 0)
  for (let i = 0; i < max; i++) {
    for (const provider of ['tenor', 'giphy'] as GifProvider[]) {
      const item = byProvider.get(provider)?.items[i]
      if (item) items.push(item)
    }
  }

  const ok: GifProvider[] = []
  const failed: GifProvider[] = []
  const errors: Partial<Record<GifProvider, string>> = {}
  const cursors: Partial<Record<GifProvider, string | null>> = {}

  for (const outcome of settled) {
    cursors[outcome.provider] = outcome.cursor
    if (outcome.items.length > 0) ok.push(outcome.provider)
    else {
      failed.push(outcome.provider)
      if (outcome.error) errors[outcome.provider] = outcome.error
    }
  }

  return {
    items,
    cursors,
    hasMore: Object.values(cursors).some((c) => !!c),
    ok,
    failed,
    errors,
    tenorConfigured,
  }
}
