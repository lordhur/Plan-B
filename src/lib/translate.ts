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
async function fetchTranslation(text: string): Promise<string | null> {
  // 1) MyMemory (gratuit, sans clé)
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=fr|en`,
    )
    if (res.ok) {
      const data = (await res.json()) as { responseData?: { translatedText?: string } }
      const out = data?.responseData?.translatedText
      if (out && !out.startsWith('MYMEMORY WARNING') && !out.startsWith('INVALID')) return out
    }
  } catch {
    /* on tente le repli */
  }
  // 2) Repli : endpoint public Google Translate (gtx)
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=en&dt=t&q=${encodeURIComponent(text)}`,
    )
    if (res.ok) {
      const data = (await res.json()) as [Array<[string | null]> | null]
      const parts = (data?.[0] ?? []).map((seg) => seg?.[0] ?? '').join('')
      if (parts.trim()) return parts
    }
  } catch {
    /* repli suivant */
  }
  return null
}

export function useTranslate(text: string | null | undefined, enabled = true): string {
  const { lang } = useLang()
  const [translated, setTranslated] = useState(text ?? '')

  useEffect(() => {
    const original = text ?? ''
    if (!original || lang !== 'en' || !enabled) {
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
    setTranslated(original)
    void fetchTranslation(key).then((out) => {
      if (cancelled || !out) return
      const next = readCache()
      next[key] = out
      writeCache(next)
      setTranslated(out)
    })

    return () => {
      cancelled = true
    }
  }, [text, lang, enabled])

  return translated || text || ''
}

