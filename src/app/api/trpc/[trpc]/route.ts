import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@/server/routers/_app'
import { createTRPCContext } from '@/server/trpc'

/**
 * Point d'entrée HTTP tRPC (App Router).
 * Toutes les procédures passent par /api/trpc/<router>.<procedure>.
 */
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError: ({ error, path }) => {
      if (error.code === 'INTERNAL_SERVER_ERROR') {
        console.error(`[tRPC] Erreur interne sur ${path}:`, error)
      }
    },
  })

export { handler as GET, handler as POST }
