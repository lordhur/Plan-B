/**
 * DÉCONNEXION « DURE »
 *
 * Le service worker (next-pwa) et le cache HTTP pouvaient resservir un
 * `/api/trpc/auth.me` encore « connecté » après la déconnexion : l'utilisateur
 * voyait « déconnecté » puis se retrouvait toujours dans son profil.
 *
 * Règle unique, appliquée partout (menu du profil, paramètres) :
 *   1. vider TOUS les caches du navigateur ;
 *   2. recharger entièrement la page vers /login?signedOut=1.
 *
 * On n'utilise JAMAIS `router.push()` après une déconnexion : la navigation
 * côté client conserve l'état React et les réponses tRPC en mémoire.
 */

/** Vide tous les caches du service worker / Cache Storage. */
export async function purgeCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return
  try {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  } catch {
    /* caches indisponibles (navigation privée, permissions) : on continue */
  }
}

/** Purge les caches puis force un rechargement complet vers la page de connexion. */
export async function hardSignOut(): Promise<void> {
  if (typeof window === 'undefined') return
  await purgeCaches()
  try {
    window.localStorage.setItem('planb.auth.hint', '0')
  } catch {
    /* ignore */
  }
  window.location.assign('/login?signedOut=1')
}
