import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { authorizeUrl, isProviderConfigured, type OAuthProvider } from '@/lib/oauth'

const PROVIDERS: OAuthProvider[] = ['google', 'facebook', 'instagram']

function baseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
}

/** Étape 1 : redirection vers le fournisseur d'identité. */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  if (!PROVIDERS.includes(provider as OAuthProvider)) {
    return NextResponse.json({ error: 'Fournisseur inconnu' }, { status: 404 })
  }
  const p = provider as OAuthProvider
  const base = baseUrl(req)

  if (!isProviderConfigured(p)) {
    // Fournisseur non configuré : retour à la connexion avec un message clair
    // (les boutons correspondants ne sont de toute façon pas affichés).
    return NextResponse.redirect(new URL(`/login?oauth=unavailable&provider=${p}`, req.url))
  }

  const state = crypto.randomUUID()
  const store = await cookies()
  store.set(`planb_oauth_state_${p}`, state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  const url = authorizeUrl(p, base, state)
  if (!url) return NextResponse.json({ error: 'Configuration invalide' }, { status: 500 })
  return NextResponse.redirect(url)
}
