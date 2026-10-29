import { TRPCError } from '@trpc/server'
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyCodeSchema,
} from '@/lib/validators'
import {
  clearSessionCookie,
  consumeVerificationCode,
  createVerificationCode,
  hashPassword,
  isEmailDeliveryConfigured,
  rateLimit,
  sendCodeEmail,
  setSessionCookie,
  verifyPassword,
} from '../auth'
import { prisma } from '../db'
import { isProviderConfigured } from '@/lib/oauth'
import { createTRPCRouter, protectedProcedure, publicProcedure } from '../trpc'

/**
 * Le code est-il affichable dans l'interface ?
 *
 * On ne le renvoie JAMAIS en silence : uniquement quand l'e-mail n'a pas pu
 * partir (aucun service configuré ou refus de Resend). Sans cela, une
 * inscription restait bloquée pour toujours sur « nous vous avons envoyé un
 * code » alors que rien n'arrivait dans la boîte mail.
 */
type Delivery = 'email' | 'on-screen'

function fallbackCode(code: string, delivered: boolean): string | undefined {
  return delivered ? undefined : code
}

export const authRouter = createTRPCRouter({
  /**
   * Étape 1 de l'inscription : email + mot de passe + identité.
   * Crée le compte (non vérifié) et envoie le code de vérification email.
   */
  register: publicProcedure.input(registerSchema).mutation(async ({ input, ctx }) => {
    const ip = 'global' // Phase 1 : limite globale ; brancher l'IP réelle via headers en prod
    const limit = rateLimit(`register:${ip}`, 10, 60 * 60 * 1000)
    if (!limit.ok) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Trop d'inscriptions — réessayez dans ${limit.retryAfterS}s`,
      })
    }

    const existing = await prisma.user.findUnique({ where: { email: input.email } })
    if (existing) {
      throw new TRPCError({ code: 'CONFLICT', message: 'Un compte existe déjà avec cet email' })
    }

    const passwordHash = await hashPassword(input.password)
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
      },
    })

    const { code } = await createVerificationCode(user.email, 'EMAIL_VERIFICATION', user.id)
    const sent = await sendCodeEmail(user.email, code, 'Votre code de vérification Plan B')
    const delivery: Delivery = sent.delivered ? 'email' : 'on-screen'

    return {
      userId: user.id,
      email: user.email,
      delivery,
      fallbackCode: fallbackCode(code, sent.delivered),
      alreadyLoggedIn: !!ctx.user,
    }
  }),

  /** Renvoie un code de vérification email. */
  resendCode: publicProcedure.input(forgotPasswordSchema).mutation(async ({ input }) => {
    const user = await prisma.user.findUnique({ where: { email: input.email } })
    if (!user) {
      // Anti-énumération : on répond OK même si l'email n'existe pas
      return { sent: true as const, delivery: 'email' as Delivery, fallbackCode: undefined }
    }
    const limit = rateLimit(`resend:${user.id}`, 5, 15 * 60 * 1000)
    if (!limit.ok) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Trop de codes demandés — réessayez plus tard',
      })
    }
    const { code } = await createVerificationCode(user.email, 'EMAIL_VERIFICATION', user.id)
    const sent = await sendCodeEmail(user.email, code, 'Votre code de vérification Plan B')
    const delivery: Delivery = sent.delivered ? 'email' : 'on-screen'
    return {
      sent: true as const,
      delivery,
      fallbackCode: fallbackCode(code, sent.delivered),
    }
  }),

  /** Le service e-mail est-il configuré ? (l'UI adapte son message) */
  deliveryStatus: publicProcedure.query(() => ({
    email: isEmailDeliveryConfigured(),
  })),

  /** Étape 2 : vérification du code email → session ouverte. */
  verifyEmail: publicProcedure.input(verifyCodeSchema).mutation(async ({ input }) => {
    const ok = await consumeVerificationCode(input.target, 'EMAIL_VERIFICATION', input.code)
    if (!ok) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Code invalide ou expiré' })
    }
    const user = await prisma.user.findUnique({ where: { email: input.target } })
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Compte introuvable' })

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    })
    await setSessionCookie(user.id)
    return { userId: user.id }
  }),

  /** Vérification téléphone (optionnelle en Phase 1, requise pour le badge Vérifié). */
  verifyPhone: protectedProcedure.input(verifyCodeSchema).mutation(async ({ input, ctx }) => {
    const ok = await consumeVerificationCode(input.target, 'PHONE_VERIFICATION', input.code)
    if (!ok) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Code invalide ou expiré' })
    }
    await prisma.user.update({
      where: { id: ctx.user.id },
      data: { phone: input.target, phoneVerified: true },
    })
    return { verified: true }
  }),

  /** Envoie le SMS/code téléphone (log serveur en dev). */
  sendPhoneCode: protectedProcedure
    .input(verifyCodeSchema.pick({ target: true }))
    .mutation(async ({ input, ctx }) => {
      const limit = rateLimit(`phone:${ctx.user.id}`, 5, 15 * 60 * 1000)
      if (!limit.ok) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Trop de demandes — réessayez plus tard',
        })
      }
      const { code } = await createVerificationCode(input.target, 'PHONE_VERIFICATION', ctx.user.id)
      // SMS non branché (Twilio = payant) : le code est affiché dans l'interface.
      console.log(`[dev] Code SMS pour ${input.target} : ${code}`)
      return { sent: true, delivery: 'on-screen' as Delivery, fallbackCode: code }
    }),

  /** Connexion email + mot de passe. */
  login: publicProcedure.input(loginSchema).mutation(async ({ input }) => {
    const limit = rateLimit(`login:${input.email}`, 8, 10 * 60 * 1000)
    if (!limit.ok) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Trop de tentatives — réessayez dans ${limit.retryAfterS}s`,
      })
    }

    const user = await prisma.user.findUnique({ where: { email: input.email } })
    if (!user || !(await verifyPassword(user.passwordHash, input.password))) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou mot de passe incorrect' })
    }
    if (!user.isActive || user.isBanned) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: user.banReason ?? 'Ce compte est suspendu',
      })
    }

    await setSessionCookie(user.id)
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    })

    return {
      userId: user.id,
      // Un e-mail non vérifié n'empêche PLUS d'utiliser l'application : une
      // bannière propose de vérifier, mais personne ne reste bloqué dehors.
      needsOnboarding: !user.emailVerified,
      emailVerified: user.emailVerified,
    }
  }),

  /** Déconnexion. */
  /** Quels fournisseurs sociaux sont réellement configurés (boutons affichés). */
  providers: publicProcedure.query(() => ({
    google: isProviderConfigured('google'),
    facebook: isProviderConfigured('facebook'),
    instagram: isProviderConfigured('instagram'),
  })),

  logout: publicProcedure.mutation(async () => {
    await clearSessionCookie()
    return { ok: true }
  }),

  /** Utilisateur courant (profil complet pour le client). */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      include: {
        interests: { select: { id: true, name: true, icon: true } },
        favoriteCategories: { select: { id: true, slug: true, name: true } },
        badges: {
          include: {
            badge: {
              select: {
                code: true,
                name: true,
                icon: true,
                color: true,
                description: true,
                category: true,
              },
            },
          },
          orderBy: { earnedAt: 'desc' },
          take: 12,
        },
      },
    })
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Compte introuvable' })
    const { passwordHash: _passwordHash, ...safe } = user
    return safe
  }),

  /** Mot de passe oublié : envoie un code de réinitialisation. */
  forgotPassword: publicProcedure.input(forgotPasswordSchema).mutation(async ({ input }) => {
    const user = await prisma.user.findUnique({ where: { email: input.email } })
    // Anti-énumération : réponse identique (et sans code) si l'email est inconnu.
    if (!user)
      return { sent: true as const, delivery: 'email' as Delivery, fallbackCode: undefined }
    const { code } = await createVerificationCode(user.email, 'PASSWORD_RESET', user.id)
    const sent = await sendCodeEmail(
      user.email,
      code,
      'Réinitialisation de votre mot de passe Plan B',
    )
    const delivery: Delivery = sent.delivered ? 'email' : 'on-screen'
    return { sent: true as const, delivery, fallbackCode: fallbackCode(code, sent.delivered) }
  }),

  /** Réinitialisation avec code + nouveau mot de passe. */
  resetPassword: publicProcedure.input(resetPasswordSchema).mutation(async ({ input }) => {
    const ok = await consumeVerificationCode(input.email, 'PASSWORD_RESET', input.code)
    if (!ok) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Code invalide ou expiré' })
    const user = await prisma.user.findUnique({ where: { email: input.email } })
    if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'Compte introuvable' })
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.password) },
    })
    return { ok: true }
  }),
})
