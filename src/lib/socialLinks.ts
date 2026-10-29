/**
 * LIENS DU PROFIL
 *
 * Un profil peut afficher autant de liens que voulu, dans l'ordre choisi par
 * l'utilisateur. Ils sont stockés dans `User.socialLinks` sous la forme :
 *
 *   [{ "type": "instagram", "url": "https://instagram.com/moi" }, …]
 *
 * L'ordre du tableau EST l'ordre d'affichage sur le profil.
 */

export const SOCIAL_TYPES = [
  'instagram',
  'tiktok',
  'youtube',
  'spotify',
  'twitter',
  'facebook',
  'website',
  'custom',
] as const

export type SocialType = (typeof SOCIAL_TYPES)[number]

export interface ProfileLink {
  type: SocialType
  url: string
}

export const SOCIAL_LABELS: Record<SocialType, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  spotify: 'Spotify',
  twitter: 'X (Twitter)',
  facebook: 'Facebook',
  website: 'Site web',
  custom: 'Autre lien',
}

/** Texte d'aide affiché sous chaque champ dans l'éditeur. */
export const SOCIAL_PLACEHOLDERS: Record<SocialType, string> = {
  instagram: '@monpseudo ou https://instagram.com/monpseudo',
  tiktok: '@monpseudo ou https://tiktok.com/@monpseudo',
  youtube: '@machaine ou https://youtube.com/@machaine',
  spotify: 'https://open.spotify.com/user/…',
  twitter: '@monpseudo ou https://x.com/monpseudo',
  facebook: 'https://facebook.com/monprofil',
  website: 'https://mon-site.fr',
  custom: 'https://…',
}

export const MAX_PROFILE_LINKS = 12

/** Nettoie une saisie libre : on accepte « @pseudo », « site.fr », une URL… */
export function normalizeLinkInput(type: SocialType, raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  const handle = value.replace(/^@/, '').replace(/\s+/g, '')
  switch (type) {
    case 'instagram':
      // Un pseudo seul → URL du profil
      if (value.startsWith('@') || !value.includes('/')) return `https://instagram.com/${handle}`
      return `https://instagram.com/${handle}`
    case 'tiktok':
      if (value.startsWith('@')) return `https://tiktok.com/@${handle}`
      return value.includes('/') ? `https://tiktok.com/${handle}` : `https://tiktok.com/@${handle}`
    case 'youtube':
      if (value.startsWith('@')) return `https://youtube.com/@${handle}`
      return `https://youtube.com/${handle}`
    case 'spotify':
      return value.includes('/') ? `https://open.spotify.com/${handle}` : value
    case 'twitter':
      if (value.startsWith('@')) return `https://x.com/${handle}`
      return value.includes('/') ? `https://x.com/${handle}` : `https://x.com/${handle}`
    case 'facebook':
      return value.includes('/')
        ? `https://facebook.com/${handle}`
        : `https://facebook.com/${handle}`
    default:
      return `https://${value.replace(/^\/+/, '')}`
  }
}

/** Transforme un lien stocké en URL ouvrable (même en cas de pseudo oublié). */
export function socialHref(type: SocialType, raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  const handle = value.replace(/^@/, '').replace(/\s+/g, '')
  switch (type) {
    case 'instagram':
      return `https://instagram.com/${handle}`
    case 'tiktok':
      return `https://tiktok.com/@${handle}`
    case 'youtube':
      return value.includes('/')
        ? `https://youtube.com/${handle}`
        : `https://youtube.com/@${handle}`
    case 'spotify':
      return `https://open.spotify.com/search/${encodeURIComponent(handle)}`
    case 'twitter':
      return `https://x.com/${handle}`
    case 'facebook':
      return `https://facebook.com/${handle}`
    default:
      return `https://${value.replace(/^\/+/, '')}`
  }
}

/** Nom court utilisé comme libellé accessible / secondaire. */
export function linkLabel(link: ProfileLink): string {
  if (link.type === 'website' || link.type === 'custom') {
    const host = hostOf(link.url)
    return host || SOCIAL_LABELS[link.type]
  }
  return SOCIAL_LABELS[link.type]
}

export function hostOf(url: string): string {
  const value = url.trim()
  try {
    return new URL(socialHref('custom', value)).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * Lit la valeur JSON renvoyée par Prisma et la normalise : types inconnus
 * ignorés, liens vides retirés, ordre conservé.
 */
export function parseSocialLinks(raw: unknown): ProfileLink[] {
  if (!Array.isArray(raw)) return []
  const out: ProfileLink[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const type = (item as { type?: unknown }).type
    const url = (item as { url?: unknown }).url
    if (typeof type !== 'string' || typeof url !== 'string') continue
    if (!SOCIAL_TYPES.includes(type as SocialType)) continue
    const clean = url.trim()
    if (!clean) continue
    out.push({ type: type as SocialType, url: clean.slice(0, 300) })
    if (out.length >= MAX_PROFILE_LINKS) break
  }
  return out
}

/** Premier type de lien encore libre (bouton « Ajouter un lien »). */
export function nextFreeType(links: ProfileLink[]): SocialType {
  const used = new Set(links.map((l) => l.type))
  const single = SOCIAL_TYPES.find((t) => t !== 'custom' && t !== 'website' && !used.has(t))
  return single ?? 'custom'
}

/** Déplace un élément du tableau (réordonnancement des logos). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list
  const copy = [...list]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item as T)
  return copy
}

/** Repère un réseau à partir d'une URL (utilisé pour les liens de la bio). */
export function detectBrand(url: string): SocialType | null {
  const value = url.toLowerCase()
  if (value.includes('instagram.com')) return 'instagram'
  if (value.includes('tiktok.com')) return 'tiktok'
  if (value.includes('youtube.com') || value.includes('youtu.be')) return 'youtube'
  if (value.includes('spotify.com')) return 'spotify'
  if (value.includes('twitter.com') || value.includes('x.com')) return 'twitter'
  if (value.includes('facebook.com') || value.includes('fb.com')) return 'facebook'
  return null
}
