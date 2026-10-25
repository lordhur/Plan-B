import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Sert les fichiers uploadés depuis data/uploads/.
 * Lecture seule, noms de fichiers générés (UUID) — pas d'accès direct au FS.
 */

export const dynamic = 'force-dynamic'

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads')

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string[] }> }) {
  const { file } = await params
  const name = file.join('/')
  // Anti path-traversal : uniquement des noms simples dans UPLOAD_DIR
  if (name.includes('..') || name.includes('/') || !/^[\w.-]+$/.test(name)) {
    return new Response('Not found', { status: 404 })
  }
  try {
    const data = await readFile(path.join(UPLOAD_DIR, name))
    const ext = path.extname(name).toLowerCase()
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
