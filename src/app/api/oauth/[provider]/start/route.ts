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
    return new Response(
      `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connexion ${p} — PlanB</title></head>
       <body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa">
       <div style="max-width:26rem;padding:2rem;background:#fff;border-radius:1rem;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center">
         <h1 style="font-size:1.1rem;margin:0 0 .5rem">Connexion ${p} pas encore activée</h1>
         <p style="font-size:.9rem;color:#555;line-height:1.5">
           Pour activer la connexion ${p}, renseignez <code>${p.toUpperCase()}_CLIENT_ID</code> et
           <code>${p.toUpperCase()}_CLIENT_SECRET</code> dans les variables d'environnement Vercel,
           avec l'URI de redirection <code>${base}/api/oauth/${p}/callback</code>.
         </p>
         <a href="/login" style="display:inline-block;margin-top:.75rem;padding:.5rem 1.25rem;background:#7c3aed;color:#fff;border-radius:.6rem;text-decoration:none;font-weight:600">Retour à la connexion</a>
       </div></body></html>`,
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
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
