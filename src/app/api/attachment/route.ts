import sharp from 'sharp'
import { getCurrentUser } from '@/server/auth'
import { prisma } from '@/server/db'

/**
 * Pièce jointe de messagerie (photo, vidéo, audio, fichier).
 *
 * POST FormData : `file`.
 * - Images : ré-encodées (WebP 1600 px, qualité 80) → type IMAGE ;
 * - Vidéos / audio / PDF : stockées telles quelles dans la limite de taille.
 *
 * Limite Vercel (plan gratuit) : ~4,5 Mo par requête → 4 Mo côté client.
 * Réponse : { url, type, name }
 */

export const dynamic = 'force-dynamic'

const MAX_SIZE = 4 * 1024 * 1024
const MAX_ENCODED = 4 * 1024 * 1024

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
const RAW_TYPES: Record<string, string> = {
  'video/mp4': 'VIDEO',
  'video/webm': 'VIDEO',
  'video/quicktime': 'VIDEO',
  'audio/mpeg': 'AUDIO',
  'audio/mp4': 'AUDIO',
  'audio/webm': 'AUDIO',
  'audio/wav': 'AUDIO',
  'application/pdf': 'FILE',
}

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
  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'Fichier trop lourd (4 Mo max.)' }, { status: 413 })
  }

  const originalName = file.name.slice(0, 120) || 'piece-jointe'
  const buffer = Buffer.from(await file.arrayBuffer())

  let data: Uint8Array<ArrayBuffer>
  let mime: string
  let mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE'
  let width: number | undefined
  let height: number | undefined

  if (IMAGE_TYPES.has(file.type)) {
    // Photo : compression serveur (le client compresse déjà, double sécurité)
    try {
      const result = await sharp(buffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true })
      data = Uint8Array.from(result.data)
      mime = 'image/webp'
      mediaType = 'IMAGE'
      width = result.info.width
      height = result.info.height
    } catch {
      return Response.json({ error: 'Image illisible' }, { status: 400 })
    }
  } else if (file.type in RAW_TYPES) {
    data = Uint8Array.from(buffer)
    mime = file.type
    mediaType = RAW_TYPES[file.type] as 'VIDEO' | 'AUDIO' | 'FILE'
  } else {
    return Response.json(
      { error: 'Format non supporté (photos, vidéos MP4/WebM, audio, PDF)' },
      { status: 400 },
    )
  }

  if (data.length > MAX_ENCODED) {
    return Response.json({ error: 'Fichier trop lourd après compression' }, { status: 413 })
  }

  const blob = await prisma.imageBlob.create({
    data: {
      ownerId: user.id,
      data,
      mime,
      name: originalName,
      width,
      height,
    },
    select: { id: true },
  })

  return Response.json(
    { url: `/api/img/${blob.id}`, type: mediaType, name: originalName },
    { status: 201 },
  )
}
