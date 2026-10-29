import { isTenorConfigured, searchGifs, type GifKind, type GifProvider } from '@/server/gifs'

/**
 * Proxy GIF / stickers (Tenor + Giphy).
 *
 * GET /api/gifs?kind=gif|sticker&q=…&provider=all|tenor|giphy&pos=&offset=&limit=
 *
 * Avantages par rapport à un appel direct depuis le navigateur :
 *  - aucun blocage par les bloqueurs de publicité ni par CORS ;
 *  - les clés restent côté serveur ;
 *  - cache CDN (`s-maxage`) → réponse instantanée et protection contre le quota.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PROVIDERS: GifProvider[] = ['tenor', 'giphy']

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const kind: GifKind = searchParams.get('kind') === 'sticker' ? 'sticker' : 'gif'
  const query = (searchParams.get('q') ?? '').trim().slice(0, 80)
  const rawProvider = searchParams.get('provider') ?? 'all'
  const providers: GifProvider[] =
    rawProvider === 'all' || !PROVIDERS.includes(rawProvider as GifProvider)
      ? PROVIDERS
      : [rawProvider as GifProvider]

  const tenorPos = searchParams.get('pos') || null
  const giphyOffset = Math.max(0, Math.min(499, Number(searchParams.get('offset') ?? 0) || 0))
  const limit = Math.max(8, Math.min(48, Number(searchParams.get('limit') ?? 24) || 24))

  try {
    const data = await searchGifs({ kind, query, providers, tenorPos, giphyOffset, limit })

    // Si tous les fournisseurs échouent, on renvoie 200 avec `failed` rempli :
    // le client affiche un état d'erreur explicite (jamais de page cassée).
    return Response.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e) {
    return Response.json(
      {
        items: [],
        cursors: {},
        hasMore: false,
        ok: [],
        failed: providers,
        errors: { tenor: e instanceof Error ? e.message : 'erreur', giphy: e instanceof Error ? e.message : 'erreur' },
        tenorConfigured: isTenorConfigured(),
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
