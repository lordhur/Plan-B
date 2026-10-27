import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/server/db'
import { hashPassword, setSessionCookie } from '@/server/auth'
import {
  exchangeCode,
  fetchProfile,
  type OAuthProvider,
} from '@/lib/oauth'

const PROVIDERS: OAuthProvider[] = ['google', 'facebook', 'instagram']

function baseUrl(req: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
}

function failPage(message: string, base: string): Response {
  return new Response(
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connexion — PlanB</title></head>
     <body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa">
     <div style="max-width:26rem;padding:2rem;background:#fff;border-radius:1rem;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center">
       <h1 style="font-size:1.1rem;margin:0 0 .5rem">Connexion impossible</h1>
       <p style="font-size:.9rem;color:#555;line-height:1.5">${message}</p>
       <a href="/login" style="display:inline-block;margin-top:.75rem;padding:.5rem 1.25rem;background:#7c3aed;color:#fff;border-radius:.6rem;text-decoration:none;font-weight:600">Réessayer</a>
     </div></body></html>`,
    { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

/** Étape 2 : retour du fournisseur — création/connexion du compte PlanB. */
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  if (!PROVIDERS.includes(provider as OAuthProvider)) {
    return NextResponse.json({ error: 'Fournisseur inconnu' }, { status: 404 })
  }
  const p = provider as OAuthProvider
  const base = baseUrl(req)

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code) return failPage('Code d’autorisation manquant.', base)

  // Vérification de l'état anti-CSRF
  const store = await cookies()
  const expected = store.get(`planb_oauth_state_${p}`)?.value
  if (expected && state && expected !== state) {
    return failPage('Vérification de sécurité échouée. Recommencez la connexion.', base)
  }
  store.delete(`planb_oauth_state_${p}`)

  try {
    const token = await exchangeCode(p, base, code)
    if (!token.accessToken) return failPage('Jeton d’accès non reçu du fournisseur.', base)
    const profile = await fetchProfile(p, token.accessToken)
    if (!profile.providerUserId) return failPage('Profil non reçu du fournisseur.', base)

    const expiresAt = token.expiresIn
      ? new Date(Date.now() + token.expiresIn * 1000)
      : null

    // 1) Compte social déjà relié ?
    let account = await prisma.connectedAccount.findUnique({
      where: { provider_providerUserId: { provider: p, providerUserId: profile.providerUserId } },
      include: { user: { select: { id: true } } },
    })

    let userId: string
    if (account) {
      userId = account.user.id
      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken ?? null,
          expiresAt,
          email: profile.email ?? account.email,
        },
      })
    } else {
      // 2) Même email → on relie le compte existant
      let user = null
      if (profile.email) {
        user = await prisma.user.findUnique({
          where: { email: profile.email.toLowerCase() },
          select: { id: true },
        })
      }

      // 3) Sinon création du compte PlanB
      if (!user) {
        // Instagram n'expose pas d'email : identité locale dérivée du compte social
        const email =
          profile.email?.toLowerCase() ?? `+${p}-${profile.providerUserId}@social.planb.app`
        user = await prisma.user.create({
          data: {
            email,
            emailVerified: !!profile.email,
            passwordHash: await hashPassword(crypto.randomUUID()),
            firstName: profile.firstName.slice(0, 40),
            lastName: profile.lastName.slice(0, 40),
            dateOfBirth: new Date('2000-01-01T00:00:00Z'),
            gender: 'PREFER_NOT_TO_SAY',
            avatarUrl: profile.avatarUrl,
            city: null,
          },
          select: { id: true },
        })
      } else if (profile.avatarUrl) {
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: profile.avatarUrl },
        })
      }

      userId = user.id
      await prisma.connectedAccount.create({
        data: {
          userId,
          provider: p,
          providerUserId: profile.providerUserId,
          email: profile.email,
          accessToken: token.accessToken,
          refreshToken: token.refreshToken ?? null,
          expiresAt,
        },
      })
    }

    await setSessionCookie(userId)
    return NextResponse.redirect(`${base}/?welcome=1`)
  } catch (err) {
    console.error('[oauth]', p, err)
    return failPage(
      'Le fournisseur a refusé la connexion. Vérifiez que l’URI de redirection est bien déclarée dans sa console.',
      base,
    )
  }
}
