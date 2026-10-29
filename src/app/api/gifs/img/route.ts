/**
 * Proxy d'images Tenor / Giphy.
 *
 * GET /api/gifs/img?u=<url encodée>          → octets de l'image
 * GET /api/gifs/img?u=<url encodée>&probe=1  → diagnostic JSON (texte)
 *
 * Pourquoi ? Les bloqueurs de publicité (très répandus) bloquent
 * `media.giphy.com` et `media.tenor.com` : sans ce proxy, les vignettes du
 * sélecteur et les GIF déjà envoyés apparaîtraient vides.
 *
 * Sécurité : seuls les hôtes Tenor/Giphy en HTTPS sont acceptés, taille
 * limitée, réponse mise en cache de façon immuable.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_HOST = /(^|\.)(tenor\.com|giphy\.com)$/i

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const raw = searchParams.get('u')
  const probe = searchParams.get('probe') === '1'
  if (!raw) return new Response('URL manquante', { status: 400 })

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return new Response('URL invalide', { status: 400 })
  }

  if (target.protocol !== 'https:' || !ALLOWED_HOST.test(target.hostname)) {
    return new Response('Hôte non autorisé', { status: 403 })
  }

  try {
    const upstream = await fetch(target.toString(), {
      signal: AbortSignal.timeout(9000),
      headers: {
        Accept: 'image/*,*/*;q=0.8',
        'User-Agent': 'PlanB/1.0 (+https://planb-lord-hur-tv.vercel.app)',
      },
      cache: 'no-store',
    })

    if (probe) {
      // Diagnostic lisible : permet de vérifier le proxy sans récupérer
      // les octets binaires.
      const buffer = upstream.ok ? await upstream.arrayBuffer() : new ArrayBuffer(0)
      return Response.json(
        {
          upstreamStatus: upstream.status,
          contentType: upstream.headers.get('content-type'),
          bytes: buffer.byteLength,
          magic: Array.from(new Uint8Array(buffer.slice(0, 6)))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join(' '),
          url: target.toString(),
        },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    if (!upstream.ok) return new Response('Image indisponible', { status: 502 })

    const type = upstream.headers.get('content-type') ?? ''
    if (!type.startsWith('image/')) return new Response('Contenu non image', { status: 415 })

    const buffer = await upstream.arrayBuffer()
    if (buffer.byteLength === 0) return new Response('Image vide', { status: 502 })
    if (buffer.byteLength > MAX_BYTES) return new Response('Image trop lourde', { status: 413 })

    return new Response(buffer, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=2592000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new Response('Image indisponible', { status: 502 })
  }
}
