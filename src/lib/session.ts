'use client'

import * as React from 'react'

import { trpc } from './trpc'

/**
 * SESSION CÔTÉ CLIENT
 *
 * Règle d'or : la barre de navigation ne doit JAMAIS osciller entre la cloche
 * des notifications et le bouton « Connexion ». On mémorise donc l'état
 * d'authentification connu (`memoryAuth`) : une requête qui échoue
 * passagèrement (réseau, réveil du service worker, cold start Vercel) ne fait
 * plus basculer l'interface d'un état à l'autre.
 */

const HINT_KEY = 'planb.auth.hint'
let memoryAuth: boolean | null = null
let lastUser: unknown = null

function readHint(): boolean | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(HINT_KEY)
    if (value === '1') return true
    if (value === '0') return false
  } catch {
    /* stockage indisponible (mode privé) : tant pis */
  }
  return null
}

function writeHint(authenticated: boolean): void {
  memoryAuth = authenticated
  try {
    window.localStorage.setItem(HINT_KEY, authenticated ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/**
 * À appeler juste après une connexion réussie : la barre affiche la cloche
 * immédiatement, sans repasser par le bouton « Connexion ».
 */
export function markAuthenticated(): void {
  writeHint(true)
}

/** À appeler juste après une déconnexion réussie. */
export function markSignedOut(): void {
  lastUser = null
  writeHint(false)
}

/** Erreur « pas connecté » (et non une panne réseau passagère) ? */
function isUnauthorized(error: unknown): boolean {
  const code = (error as { data?: { code?: string } } | null)?.data?.code
  return code === 'UNAUTHORIZED'
}

/** Session côté client — utilisateur courant via tRPC. */
export function useCurrentUser() {
  const query = trpc.auth.me.useQuery(undefined, {
    retry: false,
    // Pas de refetch au retour d'onglet : c'est ce qui faisait clignoter la
    // barre (cloche ↔ Connexion) au moindre réveil de l'application.
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  })

  // Reprise de l'état mémorisé APRÈS l'hydratation (aucun écart serveur/client).
  const [, forceHint] = React.useReducer((n: number) => n + 1, 0)
  React.useEffect(() => {
    if (memoryAuth === null) {
      const hint = readHint()
      if (hint !== null) {
        memoryAuth = hint
        forceHint()
      }
    }
  }, [])

  const user = query.data ?? null

  React.useEffect(() => {
    if (query.isSuccess) {
      lastUser = query.data
      writeHint(true)
      return
    }
    if (query.isError && isUnauthorized(query.error)) {
      // Seul un 401 certain déconnecte l'interface ; une erreur réseau ou une
      // panne serveur laisse l'état précédent en place (aucun clignotement).
      lastUser = null
      writeHint(false)
    }
  }, [query.isSuccess, query.isError, query.data, query.error])

  const unauthorized = query.isError && isUnauthorized(query.error)
  const authKnown = query.isSuccess || query.isError || memoryAuth !== null
  const isAuthenticated = Boolean(user) || (!unauthorized && memoryAuth === true)

  return {
    user,
    /**
     * Chargement : soit on ne sait encore rien, soit on se sait connecté mais
     * le profil n'est pas encore arrivé (les pages affichent alors leur
     * indicateur au lieu d'un écran vide).
     */
    isLoading: !authKnown || (isAuthenticated && !user && !query.isError),
    isAuthenticated,
    needsEmailVerification: !!user && !user.emailVerified,
    refetch: query.refetch,
  }
}
