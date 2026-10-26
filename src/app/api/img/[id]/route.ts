import { prisma } from '@/server/db'

/**
 * Sert une image stockée en base (ImageBlob).
 * Les contenus sont immuables (id = cuid) → cache navigateur d'un an.
 */

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const blob = await prisma.imageBlob.findUnique({ where: { id } })
  if (!blob) return new Response('Image introuvable', { status: 404 })

  return new Response(new Uint8Array(blob.data), {
    headers: {
      'Content-Type': blob.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
