import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { getCurrentUser } from '@/server/auth'
import { prisma } from '@/server/db'

/**
 * Upload de photos d'album (spec Phase 3 §3.2).
 *
 * Stockage local dans `data/uploads/` (servi par /api/media/[...file]).
 * En production serverless, remplacer par Supabase Storage / S3 :
 * seule la fonction `persist()` change, l'API reste identique.
 *
 * POST FormData : file (image ≤ 8 Mo), eventId, caption?
 */

export const dynamic = 'force-dynamic'

const MAX_SIZE = 8 * 1024 * 1024
const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads')
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Authentification requise' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file')
  const eventId = String(form.get('eventId') ?? '')
  const caption = form.get('caption') ? String(form.get('caption')).slice(0, 200) : null

  if (!(file instanceof File)) return Response.json({ error: 'Fichier manquant' }, { status: 400 })
  if (!ALLOWED.has(file.type)) {
    return Response.json({ error: 'Format non supporté (JPEG, PNG, WebP, GIF)' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'Fichier trop lourd (8 Mo max.)' }, { status: 400 })
  }

  // Réservé à l'organisateur et aux participants d'un événement terminé/en cours
  const [event, participation] = await Promise.all([
    prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, organizerId: true, status: true, endDate: true, title: true },
    }),
    prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
      select: { status: true },
    }),
  ])
  if (!event) return Response.json({ error: 'Événement introuvable' }, { status: 404 })
  const allowed =
    event.organizerId === user.id ||
    (participation && ['CONFIRMED', 'ATTENDED'].includes(participation.status))
  if (!allowed) return Response.json({ error: 'Réservé aux participants' }, { status: 403 })
  if (event.status !== 'COMPLETED' && event.status !== 'ONGOING') {
    return Response.json({ error: 'Les photos s’ajoutent pendant ou après l’événement' }, { status: 400 })
  }
  // Album verrouillé 30 jours après la fin
  if (event.endDate && Date.now() - event.endDate.getTime() > 30 * 24 * 3600 * 1000) {
    return Response.json({ error: 'L’album est verrouillé (30 jours après l’événement)' }, { status: 400 })
  }

  const album = await prisma.eventAlbum.upsert({
    where: { eventId },
    update: {},
    create: { eventId },
  })
  if (album.isLocked) return Response.json({ error: 'Album verrouillé' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/gif' ? 'gif' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const name = `${Date.now()}-${randomUUID()}.${ext}`

  // Redimensionne (max 1600 px) + génère une miniature 400 px
  const image = sharp(buffer).rotate()
  const full = await image.clone().resize({ width: 1600, withoutEnlargement: true }).toBuffer()
  const thumb = await image.clone().resize({ width: 400, withoutEnlargement: true }).toBuffer()

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(path.join(UPLOAD_DIR, name), full)
  await writeFile(path.join(UPLOAD_DIR, `thumb-${name}`), thumb)

  const media = await prisma.media.create({
    data: {
      albumId: album.id,
      uploaderId: user.id,
      url: `/api/media/file/${name}`,
      thumbnailUrl: `/api/media/file/thumb-${name}`,
      type: 'IMAGE',
      caption,
    },
    include: { uploader: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
  })

  return Response.json({ media }, { status: 201 })
}
