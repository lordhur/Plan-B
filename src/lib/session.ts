'use client'

import { trpc } from './trpc'

/** Session côté client — utilisateur courant via tRPC. */
export function useCurrentUser() {
  const query = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: true,
  })
  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
    needsEmailVerification: !!query.data && !query.data.emailVerified,
    refetch: query.refetch,
  }
}
