import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  // Le Service Worker n'est actif qu'en production (évite le cache en dev)
  disable: process.env.NODE_ENV === 'development',
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  fallbacks: {
    document: '/offline',
  },
  workboxOptions: {
    runtimeCaching: [
      {
        /**
         * AUCUNE réponse d'API en cache.
         * Le cache « apis » de next-pwa gardait 24 h de réponses GET, dont
         * `auth.me` : après une déconnexion (ou une connexion) le service
         * worker resservait l'ancienne session et l'utilisateur restait
         * « connecté ». On garde le même cacheName pour remplacer la règle
         * par défaut, avec une stratégie réseau strict.
         */
        urlPattern: ({ sameOrigin, url: { pathname } }) =>
          Boolean(sameOrigin) && pathname.startsWith('/api/'),
        handler: 'NetworkOnly',
        method: 'GET',
        options: { cacheName: 'apis' },
      },
    ],
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Le linting tourne via `npm run lint` (CI) — on ne bloque pas le build ici
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['@node-rs/argon2', 'pg', '@electric-sql/pglite'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Cloudflare R2 / Supabase Storage (production)
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
    ],
  },
}

export default withPWA(nextConfig)
