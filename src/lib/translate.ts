'use client'

import { useEffect, useState } from 'react'
import { useLang } from './i18n'

const CACHE_KEY = 'planb_translations'

type Cache = Record<string, string>

function readCache(): Cache {
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? '{}') as Cache
  } catch {
    return {}
  }
}

function writeCache(cache: Cache) {
  try {
    // Limite : on garde les 400 dernières entrées
    const entries = Object.entries(cache).slice(-400)
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    /* stockage plein : tant pis */
  }
}

/**
 * Traduction automatique FR → EN via l'API gratuite MyMemory (sans clé).
 * Hors ligne / quota atteint : on réaffiche le texte d'origine.
 * Résultat mis en cache (localStorage) pour économiser le quota.
 */
export function useTranslate(text: string | null | undefined): string {
  const { lang } = useLang()
  const [translated, setTranslated] = useState(text ?? '')

  useEffect(() => {
    const original = text ?? ''
    if (!original || lang !== 'en') {
      setTranslated(original)
      return
    }

    const key = original.slice(0, 480)
    const cache = readCache()
    const cached = cache[key]
    if (cached) {
      setTranslated(cached)
      return
    }

    let cancelled = false
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(key)}&langpair=fr|en`
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { responseData?: { translatedText?: string } } | null) => {
        const out = data?.responseData?.translatedText
        if (cancelled || !out) return
        const next = readCache()
        next[key] = out
        writeCache(next)
        setTranslated(out)
      })
      .catch(() => {
        /* repli : texte original */
      })

    return () => {
      cancelled = true
    }
  }, [text, lang])

  return translated || text || ''
}
