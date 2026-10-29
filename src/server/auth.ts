import { hash, verify } from '@node-rs/argon2'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { prisma } from './db'

/**
 * Couche d'authentification PlanB.
 *
 * Phase 1 : sessions JWT stateless (cookie httpOnly) + Argon2id pour les mots
 * de passe + codes de vérification à 6 chiffres (email/téléphone/reset).
 *
 * L'envoi d'emails passe par Resend si RESEND_API_KEY est définie ; sinon les
 * codes sont affichés dans les logs serveur (mode développement) et renvoyés
 * à l'UI en dev pour permettre la démo sans service email.
 *
 * Migration Supabase Auth : cette couche est volontairement isolée — remplacer
 * `hashPassword`/`verifyPassword`/`createSession`/`getCurrentUser` par les
 * équivalents Supabase suffit, les routers tRPC n'y touchent pas.
 */

export const SESSION_COOKIE = 'planb_session'
const SESSION_DURATION_S = 60 * 60 * 24 * 30 // 30 jours

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET manquante en production')
    }
    return new TextEncoder().encode('dev-secret-planb-insecure')
  }
  return new TextEncoder().encode(secret)
}

// ----------------------------- Mots de passe -----------------------------

export async function hashPassword(password: string): Promise<string> {
  return hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 })
}

export async function verifyPassword(hashed: string, password: string): Promise<boolean> {
  try {
    return await verify(hashed, password)
  } catch {
    return false
  }
}

// ----------------------------- Sessions (JWT) -----------------------------

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_S}s`)
    .setIssuer('planb')
    .sign(getSecret())
}

export async function setSessionCookie(userId: string): Promise<void> {
  const token = await createSessionToken(userId)
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_S,
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  // Mêmes attributs que `setSessionCookie` : un navigateur ne remplace un
  // cookie que si nom + domaine + chemin concordent (Safari est strict).
  store.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    expires: new Date(0),
    path: '/',
  })
}

export type SessionUser = {
  id: string
  email: string
  emailVerified: boolean
  phoneVerified: boolean
  firstName: string
  lastName: string
  displayName: string | null
  avatarUrl: string | null
  dateOfBirth: Date
  gender: string
  city: string | null
  latitude: number | null
  longitude: number | null
  trustScore: number
  averageRating: number
  totalRatings: number
  eventsCreated: number
  eventsAttended: number
  isBanned: boolean
  isActive: boolean
  createdAt: Date
}

/** Résout l'utilisateur courant depuis le cookie de session (mémoïsé par requête). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret(), { issuer: 'planb' })
    const userId = payload.sub
    if (!userId) return null
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        phoneVerified: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatarUrl: true,
        dateOfBirth: true,
        gender: true,
        city: true,
        latitude: true,
        longitude: true,
        trustScore: true,
        averageRating: true,
        totalRatings: true,
        eventsCreated: true,
        eventsAttended: true,
        isBanned: true,
        isActive: true,
        createdAt: true,
      },
    })
    if (!user || !user.isActive || user.isBanned) return null
    return user as SessionUser
  } catch {
    return null
  }
})

// ----------------------------- Codes de vérification -----------------------------

export function generateNumericCode(): string {
  // 6 chiffres, source cryptographique
  const bytes = new Uint32Array(1)
  crypto.getRandomValues(bytes)
  return String(bytes[0]! % 1000000).padStart(6, '0')
}

export async function createVerificationCode(
  target: string,
  type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET',
  userId?: string,
): Promise<{ code: string }> {
  const code = generateNumericCode()
  const codeHash = await hashPassword(code)
  // Invalide les codes précédents du même type
  await prisma.verificationCode.deleteMany({ where: { target, type, consumedAt: null } })
  await prisma.verificationCode.create({
    data: {
      target,
      codeHash,
      type,
      userId,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    },
  })
  return { code }
}

export async function consumeVerificationCode(
  target: string,
  type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET',
  code: string,
): Promise<boolean> {
  const record = await prisma.verificationCode.findFirst({
    where: { target, type, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  if (!record) return false
  if (record.attempts >= 5) return false
  const ok = await verifyPassword(record.codeHash, code)
  if (!ok) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    return false
  }
  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  })
  return true
}

/** Un service d'envoi d'e-mails est-il configuré ? (Resend, gratuit à 100/jour) */
export function isEmailDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY)
}

export interface EmailDelivery {
  /** true = l'e-mail est parti ; false = aucun envoi possible (voir `error`). */
  delivered: boolean
  reason?: 'not_configured' | 'provider_error'
  error?: string
}

/**
 * Envoie un code par email.
 *
 * - RESEND_API_KEY définie → API Resend.
 * - Sinon (ou si Resend refuse l'envoi) → `delivered: false` : l'appelant
 *   affiche alors le code directement dans l'interface pour que la
 *   vérification reste possible sans service e-mail. Aucun compte ne reste
 *   bloqué faute d'avoir reçu un message.
 */
export async function sendCodeEmail(
  to: string,
  code: string,
  subject: string,
): Promise<EmailDelivery> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'PlanB <onboarding@resend.dev>'
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY absente — code pour ${to} : ${code}`)
    return { delivered: false, reason: 'not_configured' }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#7c3aed">Plan B</h2>
          <p>Votre code de vérification :</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0f172a">${code}</p>
          <p style="color:#64748b;font-size:13px">Valable 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        </div>`,
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      console.error('[email] Erreur Resend :', detail)
      return { delivered: false, reason: 'provider_error', error: detail.slice(0, 300) }
    }
    return { delivered: true }
  } catch (err) {
    console.error('[email] Envoi impossible :', err)
    return { delivered: false, reason: 'provider_error', error: String(err) }
  }
}

// ----------------------------- Rate limiting (anti-abus) -----------------------------

/**
 * Rate limiter en mémoire (par instance).
 * Production multi-instances : remplacer par Redis/Upstash (même interface).
 */
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): { ok: boolean; retryAfterS: number } {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterS: 0 }
  }
  bucket.count += 1
  if (bucket.count > max) {
    return { ok: false, retryAfterS: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  return { ok: true, retryAfterS: 0 }
}
