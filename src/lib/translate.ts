'use client'

import { useEffect, useState } from 'react'
import { useLang } from './i18n'

const CACHE_KEY = 'planb_translations_v2'

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
    // Limite : on garde les 600 dernières entrées
    const entries = Object.entries(cache).slice(-600)
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    /* stockage plein : tant pis */
  }
}

/** Traduit un texte vers `target` (détection automatique de la langue source). */
export async function translateText(text: string, target: string): Promise<string | null> {
  const clean = text.trim()
  if (!clean) return null

  // 1) Endpoint public Google Translate — détecte la langue source automatiquement.
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(clean.slice(0, 900))}`,
    )
    if (res.ok) {
      const data = (await res.json()) as [Array<[string | null]> | null]
      const parts = (data?.[0] ?? []).map((seg) => seg?.[0] ?? '').join('')
      if (parts.trim()) return parts
    }
  } catch {
    /* repli */
  }

  // 2) Repli MyMemory (gratuit, sans clé) — paire FR → cible
  if (target !== 'fr') {
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean.slice(0, 480))}&langpair=fr|${target}`,
      )
      if (res.ok) {
        const data = (await res.json()) as { responseData?: { translatedText?: string } }
        const out = data?.responseData?.translatedText
        if (out && !out.startsWith('MYMEMORY WARNING') && !out.startsWith('INVALID')) return out
      }
    } catch {
      /* tout a échoué : on garde l'original */
    }
  }
  return null
}

/**
 * Traduction d'un texte vers la langue de l'interface (FR/EN).
 * Résultat mis en cache (localStorage) pour ne pas rappeler l'API.
 */
export function useTranslation(
  text: string | null | undefined,
  enabled = true,
  target?: string,
): { text: string; translated: boolean; loading: boolean } {
  const { lang } = useLang()
  const to = target ?? lang
  const original = text ?? ''
  const key = `${to}::${original.slice(0, 480)}`
  const [state, setState] = useState<{ value: string; done: boolean }>({ value: original, done: false })

  useEffect(() => {
    if (!original || !enabled) {
      setState({ value: original, done: false })
      return
    }
    const cache = readCache()
    const cached = cache[key]
    if (cached) {
      setState({ value: cached, done: true })
      return
    }
    let cancelled = false
    setState({ value: original, done: false })
    void translateText(original, to).then((out) => {
      if (cancelled) return
      if (!out || out === original) {
        setState({ value: original, done: true })
        return
      }
      const next = readCache()
      next[key] = out
      writeCache(next)
      setState({ value: out, done: true })
    })
    return () => {
      cancelled = true
    }
  }, [key, original, enabled, to])

  return { text: state.value || original, translated: enabled && state.done && state.value !== original, loading: enabled && !state.done }
}

/** Compatibilité : renvoie directement le texte (traduit si activé). */
export function useTranslate(text: string | null | undefined, enabled = true): string {
  return useTranslation(text, enabled).text
}

/** Détection grossière de la langue d'un texte — évite de « traduire » un texte déjà lisible. */
export function detectLang(text: string): 'fr' | 'en' | 'other' {
  const sample = ` ${text.toLowerCase().replace(/[’']/g, ' ')} `
  const fr = (sample.match(/\b(le|la|les|des|une|un|du|et|est|vous|votre|pour|avec|dans|sur|pas|qui|que|au|aux|ce|cette|nous|mon|ma|mes|vos|nos|ses|son|sa|je|tu|il|elle|on|ils|elles|quel|quelle|quand|comment|tout|tous|toute|plus|sans|comme|aussi|très|bien|merci|bonjour|salut|oui|non)\b/g) ?? []).length
  const en = (sample.match(/\b(the|and|your|with|for|from|this|that|you|are|was|will|have|has|not|our|their|his|her|its|of|to|in|on|is|be|my|me|we|they|what|when|how|all|more|without|like|also|very|good|thanks|hello|hi|yes|no)\b/g) ?? []).length
  const accents = (text.match(/[àâäéèêëîïôöùûüçœ]/gi) ?? []).length
  if (accents > 0) return fr >= en ? 'fr' : 'en'
  if (fr > en && fr > 0) return 'fr'
  if (en > fr && en > 0) return 'en'
  return 'other'
}
