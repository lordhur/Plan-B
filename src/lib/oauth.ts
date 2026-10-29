/**
 * Connexion sociale — Google, Facebook, Instagram (OAuth 2.0, zéro budget).
 *
 * Chaque fournisseur s'active en renseignant ses identifiants dans les
 * variables d'environnement Vercel :
 *  - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET        (console.cloud.google.com → APIs & Services → Credentials)
 *  - FACEBOOK_CLIENT_ID / FACEBOOK_CLIENT_SECRET    (developers.facebook.com → Mon application → Facebook Login)
 *  - INSTAGRAM_CLIENT_ID / INSTAGRAM_CLIENT_SECRET  (developers.facebook.com → Instagram Login)
 *
 * URI de redirection à déclarer chez chaque fournisseur :
 *   https://<votre-domaine>/api/oauth/{google|facebook|instagram}/callback
 */

export type OAuthProvider = 'google' | 'facebook' | 'instagram'

export interface ProviderConfig {
  clientId: string
  clientSecret: string
  authorizeUrl: string
  tokenUrl: string
  scopes: string
  label: string
}

const ENV: Record<OAuthProvider, { id: string; secret: string }> = {
  google: {
    id: process.env.GOOGLE_CLIENT_ID ?? '',
    secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  },
  facebook: {
    id: process.env.FACEBOOK_CLIENT_ID ?? '',
    secret: process.env.FACEBOOK_CLIENT_SECRET ?? '',
  },
  instagram: {
    id: process.env.INSTAGRAM_CLIENT_ID ?? '',
    secret: process.env.INSTAGRAM_CLIENT_SECRET ?? '',
  },
}

export function providerConfig(provider: OAuthProvider, baseUrl: string): ProviderConfig | null {
  const { id, secret } = ENV[provider]
  if (!id || !secret) return null
  switch (provider) {
    case 'google':
      return {
        clientId: id,
        clientSecret: secret,
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: 'openid email profile',
        label: 'Google',
      }
    case 'facebook':
      return {
        clientId: id,
        clientSecret: secret,
        authorizeUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
        scopes: 'email,public_profile,user_photos',
        label: 'Facebook',
      }
    case 'instagram':
      // « Instagram API with Instagram Login » (compte professionnel requis).
      // 1. autorisation → 2. code échangé contre un jeton court (1 h) sur
      // api.instagram.com → 3. (optionnel) jeton long via graph.instagram.com.
      return {
        clientId: id,
        clientSecret: secret,
        authorizeUrl: 'https://www.instagram.com/oauth/authorize',
        tokenUrl: 'https://api.instagram.com/oauth/access_token',
        scopes: 'instagram_business_basic',
        label: 'Instagram',
      }
  }
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  const { id, secret } = ENV[provider]
  return !!id && !!secret
}

export function redirectUri(provider: OAuthProvider, baseUrl: string): string {
  return `${baseUrl}/api/oauth/${provider}/callback`
}

/** URL d'autorisation (avec état anti-CSRF). */
export function authorizeUrl(
  provider: OAuthProvider,
  baseUrl: string,
  state: string,
): string | null {
  const cfg = providerConfig(provider, baseUrl)
  if (!cfg) return null
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri(provider, baseUrl),
    response_type: 'code',
    scope: cfg.scopes,
    state,
  })
  return `${cfg.authorizeUrl}?${params.toString()}`
}

export interface SocialToken {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
}

export interface SocialProfile {
  providerUserId: string
  email: string | null
  firstName: string
  lastName: string
  avatarUrl: string | null
}

async function postForm(
  url: string,
  body: Record<string, string>,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  })
  if (!res.ok) throw new Error(`Token ${res.status}`)
  return (await res.json()) as Record<string, unknown>
}

/** Échange du code d'autorisation contre un jeton d'accès. */
export async function exchangeCode(
  provider: OAuthProvider,
  baseUrl: string,
  code: string,
): Promise<SocialToken> {
  const cfg = providerConfig(provider, baseUrl)
  if (!cfg) throw new Error('Fournisseur non configuré')
  const redirect = redirectUri(provider, baseUrl)

  if (provider === 'facebook') {
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: redirect,
      client_secret: cfg.clientSecret,
      code,
    })
    const res = await fetch(`${cfg.tokenUrl}?${params.toString()}`)
    if (!res.ok) throw new Error(`Token ${res.status}`)
    const data = (await res.json()) as Record<string, unknown>
    return {
      accessToken: String(data.access_token ?? ''),
      expiresIn: typeof data.expires_in === 'number' ? data.expires_in : undefined,
    }
  }

  const data = await postForm(cfg.tokenUrl, {
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    code,
    redirect_uri: redirect,
    grant_type: 'authorization_code',
  })
  return {
    accessToken: String(data.access_token ?? ''),
    refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
    expiresIn: typeof data.expires_in === 'number' ? data.expires_in : undefined,
  }
}

/** Profil de l'utilisateur connecté chez le fournisseur. */
export async function fetchProfile(provider: OAuthProvider, token: string): Promise<SocialProfile> {
  if (provider === 'google') {
    const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Profil ${res.status}`)
    const d = (await res.json()) as Record<string, unknown>
    return {
      providerUserId: String(d.sub ?? ''),
      email: typeof d.email === 'string' ? d.email : null,
      firstName: String(d.given_name ?? d.name ?? 'Membre'),
      lastName: String(d.family_name ?? 'PlanB'),
      avatarUrl: typeof d.picture === 'string' ? d.picture : null,
    }
  }

  if (provider === 'facebook') {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,email,first_name,last_name,picture.width(400)&access_token=${encodeURIComponent(token)}`,
    )
    if (!res.ok) throw new Error(`Profil ${res.status}`)
    const d = (await res.json()) as Record<string, unknown>
    const pic = d.picture as { data?: { url?: string } } | undefined
    return {
      providerUserId: String(d.id ?? ''),
      email: typeof d.email === 'string' ? d.email : null,
      firstName: String(d.first_name ?? d.name ?? 'Membre'),
      lastName: String(d.last_name ?? 'PlanB'),
      avatarUrl: pic?.data?.url ?? null,
    }
  }

  // Instagram (Instagram Login) — pas d'email exposé : identité = user_id
  const res = await fetch(
    `https://graph.instagram.com/me?fields=user_id,username,profile_picture_url&access_token=${encodeURIComponent(token)}`,
  )
  if (!res.ok) throw new Error(`Profil ${res.status}`)
  const d = (await res.json()) as Record<string, unknown>
  const username = String(d.username ?? 'membre')
  return {
    providerUserId: String(d.user_id ?? ''),
    email: null,
    firstName: username,
    lastName: 'Instagram',
    avatarUrl: typeof d.profile_picture_url === 'string' ? d.profile_picture_url : null,
  }
}

/** Photos du compte social — candidates pour la photo de profil / albums. */
export async function fetchPhotos(
  provider: OAuthProvider,
  token: string,
  limit = 24,
): Promise<string[]> {
  if (provider === 'facebook') {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me/photos?fields=images&limit=${limit}&access_token=${encodeURIComponent(token)}`,
    )
    if (!res.ok) return []
    const d = (await res.json()) as {
      data?: { images?: { url?: string; width?: number }[] }[]
    }
    return (d.data ?? [])
      .map((p) => p.images?.sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0]?.url)
      .filter((u): u is string => !!u)
  }
  if (provider === 'instagram') {
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=id,media_type,media_url&limit=${limit}&access_token=${encodeURIComponent(token)}`,
    )
    if (!res.ok) return []
    const d = (await res.json()) as {
      data?: { media_type?: string; media_url?: string }[]
    }
    return (d.data ?? [])
      .filter((m) => m.media_type === 'IMAGE' && m.media_url)
      .map((m) => m.media_url as string)
  }
  if (provider === 'google') {
    // Google Photos API exige un scope dédié — la photo de profil suffit ici.
    return []
  }
  return []
}
