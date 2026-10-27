/**
 * Téléversement direct vers Supabase Storage (bucket public « media »).
 * Contourne la limite de ~4,5 Mo des fonctions Vercel : les vidéos et
 * fichiers volumineux partent du navigateur vers le stockage (50 Mo max).
 * La clé utilisée est la clé « anon » publique — conçue pour être exposée ;
 * les politiques RLS n'autorisent que l'insertion dans le bucket « media ».
 */
export const SUPABASE_URL = 'https://kwnqvyjrynlgokdcqmwi.supabase.co'
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3bnF2eWpyeW5sZ29rZGNxbXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NTk1MDYsImV4cCI6MjEwODUzNTUwNn0.ZcKGzooP3rBgw0PoCc3cu1uFNpVZOBk7BPf-DHkB3S0'

/** Limite côté bucket : 50 Mo. */
export const MAX_STORAGE_FILE = 50 * 1024 * 1024

/** Envoie un fichier vers le bucket « media » et renvoie son URL publique. */
export async function uploadToStorage(file: File, folder: string): Promise<string> {
  if (file.size > MAX_STORAGE_FILE) {
    throw new Error('Fichier trop lourd (50 Mo maximum).')
  }
  const safeExt = (file.name.split('.').pop() ?? 'bin').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt || 'bin'}`

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/media/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: file,
  })
  if (!res.ok) {
    throw new Error('Téléversement impossible — réessayez.')
  }
  return `${SUPABASE_URL}/storage/v1/object/public/media/${path}`
}
