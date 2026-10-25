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
