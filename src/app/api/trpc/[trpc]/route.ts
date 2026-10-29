import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@/server/routers/_app'
import { createTRPCContext } from '@/server/trpc'

/**
 * Point d'entrée HTTP tRPC (App Router).
 * Toutes les procédures passent par /api/trpc/<router>.<procedure>.
 */
const inner = (req: Request) =>
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

/**
 * Aucune réponse tRPC ne doit être conservée : ni par le navigateur, ni par un
 * cache intermédiaire. Sans cet en-tête, un `auth.me` mis en cache (service
 * worker, CDN, cache disque) pouvait répondre « connecté » après une
 * déconnexion — l'utilisateur restait alors bloqué dans sa session.
 */
async function handler(req: Request) {
  const res = await inner(req)
  const headers = new Headers(res.headers)
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  headers.set('Pragma', 'no-cache')
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  })
}

export { handler as GET, handler as POST, handler as PATCH, handler as PUT, handler as DELETE }
