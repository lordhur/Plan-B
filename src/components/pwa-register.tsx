'use client'

import { useEffect } from 'react'

/**
 * Enregistre le Service Worker généré par next-pwa (production uniquement)
 * et propose le rechargement quand une nouvelle version est disponible.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nouvelle version disponible — recharge au prochain chargement
              console.log('[PWA] Nouvelle version disponible')
            }
          })
        })
      })
      .catch((err) => console.error('[PWA] Échec enregistrement SW :', err))
  }, [])

  return null
}
