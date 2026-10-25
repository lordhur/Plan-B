import type { MetadataRoute } from 'next'

/** Manifest PWA — PlanB installable comme une app native. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PlanB — Le réseau social du futur',
    short_name: 'PlanB',
    description: 'Postez ce que vous allez faire. Les autres rejoignent en un clic.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#7c3aed',
    lang: 'fr',
    categories: ['social', 'lifestyle'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Créer un plan',
        short_name: 'Créer',
        url: '/events/create',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Explorer',
        short_name: 'Explorer',
        url: '/explore',
      },
    ],
  }
}
