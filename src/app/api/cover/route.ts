import sharp from 'sharp'
import { getCurrentUser } from '@/server/auth'
import { prisma } from '@/server/db'

/**
 * Upload d'une image de couverture (événement).
 *
 * POST FormData : `file` (image ≤ 10 Mo).
 * L'image est ré-encodée côté serveur (WebP, 1600 px max, qualité 80) puis
 * stockée en base (`ImageBlob`) — servie par /api/img/[id] avec cache immuable.
 * Réponse : { url: "/api/img/<id>" }
 */

export const dynamic = 'force-dynamic'

const MAX_SIZE = 10 * 1024 * 1024
const MAX_ENCODED = 4 * 1024 * 1024
const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Authentification requise' }, { status: 401 })

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json({ error: 'Requête invalide' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return Response.json({ error: 'Fichier manquant' }, { status: 400 })
  }
  if (!ALLOWED.has(file.type)) {
    return Response.json({ error: 'Format non supporté (JPEG, PNG, WebP, GIF, AVIF)' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'Image trop lourde (10 Mo max.)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let data: Buffer
  let width: number | undefined
  let height: number | undefined
  try {
    const result = await sharp(buffer)
      .rotate() // respecte l'EXIF (photos de téléphone)
      .resize({ width: 1600, height: 900, fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true })
    data = result.data
    width = result.info.width
    height = result.info.height
  } catch {
    return Response.json({ error: 'Image illisible' }, { status: 400 })
  }

  if (data.length > MAX_ENCODED) {
    return Response.json({ error: 'Image trop lourde après compression' }, { status: 413 })
  }

  const blob = await prisma.imageBlob.create({
    // Uint8Array « pur » : le typage Buffer (ArrayBufferLike) ne satisfait pas Bytes
    data: { ownerId: user.id, data: new Uint8Array(data), mime: 'image/webp', width, height },
    select: { id: true },
  })

  return Response.json({ url: `/api/img/${blob.id}` }, { status: 201 })
}
