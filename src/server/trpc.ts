import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { getCurrentUser, type SessionUser } from './auth'

/**
 * Initialisation tRPC — typage end-to-end entre le serveur et les composants React.
 */

export interface Context {
  user: SessionUser | null
}

export async function createTRPCContext(): Promise<Context> {
  const user = await getCurrentUser()
  return { user }
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const createCallerFactory = t.createCallerFactory
export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

/** Procédure réservée aux utilisateurs connectés. */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Connexion requise' })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})

/**
 * Procédure réservée aux comptes vérifiés (email confirmé).
 * Conformément à la spec : un profil non vérifié ne peut ni créer ni rejoindre
 * d'événements.
 */
export const verifiedProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.emailVerified) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Vérifiez votre email pour effectuer cette action',
    })
  }
  if (ctx.user.trustScore < 10) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Compte suspendu — contactez le support PlanB',
    })
  }
  return next({ ctx })
})
