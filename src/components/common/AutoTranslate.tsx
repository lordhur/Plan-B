'use client'

import { useEffect } from 'react'
import { useLang } from '@/lib/i18n'
import { detectLang, translateText } from '@/lib/translate'

/**
 * Traduction automatique de TOUS les textes de l'interface (spec).
 *
 * Les composants principaux utilisent déjà `t()` ; ce filet de sécurité
 * traduit à la volée les textes encore écrits en dur (pages secondaires,
 * libellés dynamiques…), sans toucher au contenu saisi par l'utilisateur
 * (fil de discussion, champs de saisie, éditeurs).
 *
 * - Cache localStorage : une traduction n'est demandée qu'une seule fois.
 * - Les zones marquées `data-no-translate` (messages, champs) sont ignorées.
 * - Aucune requête quand l'interface est en français.
 */

const CACHE_KEY = 'planb_ui_translations'
const MAX_REQUESTS_PER_PASS = 60
const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'CODE',
  'PRE',
  'TEXTAREA',
  'INPUT',
  'OPTION',
  'SELECT',
  'KBD',
  'SAMP',
  'SVG',
  'PATH',
  'CANVAS',
  'IFRAME',
])

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
    const entries = Object.entries(cache).slice(-1500)
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    /* stockage plein : on continue sans cache */
  }
}

/** Un texte à traduire ? (lettres présentes, pas purement numérique, assez long) */
function translatable(raw: string): boolean {
  const v = raw.trim()
  if (v.length < 3 || v.length > 400) return false
  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(v)) return false
  // Emails, URLs, identifiants techniques
  if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(v)) return false
  if (/^(https?:\/\/|www\.)/i.test(v)) return false
  if (/^[\d\s.,:+\-/()%€$°]+$/.test(v)) return false
  return true
}

/** Le texte est-il déjà dans la langue de l'interface ? */
function alreadyInLang(v: string, lang: string): boolean {
  const detected = detectLang(v)
  return detected === lang || detected === 'other'
}

function collectCandidates(): Text[] {
  if (typeof document === 'undefined') return []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT
      if (parent.isContentEditable) return NodeFilter.FILTER_REJECT
      if (parent.closest('[data-no-translate]')) return NodeFilter.FILTER_REJECT
      if (parent.getAttribute('translate') === 'no') return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  const out: Text[] = []
  let n = walker.nextNode()
  while (n) {
    out.push(n as Text)
    n = walker.nextNode()
  }
  return out
}

/** Dernière traduction appliquée par nœud — évite de retraduire nos propres écritures. */
const applied = new WeakMap<Text, string>()
/** Texte d'origine des nœuds traduits — permet de revenir au français instantanément. */
const originals = new Map<Text, string>()

function applyTranslation(node: Text, translated: string) {
  const raw = node.nodeValue ?? ''
  const lead = raw.match(/^\s*/)?.[0] ?? ''
  const tail = raw.match(/\s*$/)?.[0] ?? ''
  const next = `${lead}${translated}${tail}`
  if (node.nodeValue !== next) {
    if (!originals.has(node)) originals.set(node, raw)
    node.nodeValue = next
    applied.set(node, next)
  }
}

/** Retour au français : on remet chaque nœud traduit dans son texte d'origine. */
function restoreOriginals() {
  for (const [node, original] of originals) {
    if (node.isConnected && node.nodeValue !== original) node.nodeValue = original
  }
  originals.clear()
}

export function AutoTranslate() {
  const { lang } = useLang()

  useEffect(() => {
    if (lang === 'fr') {
      // Interface repassée en français : on annule toutes nos traductions.
      restoreOriginals()
      return
    }
    let cancelled = false
    let running = false
    let queued = false

    const run = async () => {
      if (running || cancelled) {
        queued = true
        return
      }
      running = true
      try {
        const cache = readCache()
        const nodes = collectCandidates()
        const missing = new Map<string, Text[]>()
        for (const node of nodes) {
          const raw = node.nodeValue ?? ''
          // Déjà traduit par nous : React n'a pas réécrit le nœud, on ne refait rien.
          if (applied.get(node) === raw) continue
          if (!translatable(raw)) continue
          const key = `${lang}::${raw.trim()}`
          const cached = cache[key]
          if (cached) {
            applyTranslation(node, cached)
            continue
          }
          if (alreadyInLang(raw, lang)) continue
          const list = missing.get(raw.trim()) ?? []
          list.push(node)
          missing.set(raw.trim(), list)
        }

        const pending = [...missing.entries()].slice(0, MAX_REQUESTS_PER_PASS)
        if (pending.length === 0) return

        // Traductions par petits lots pour ne pas saturer l'API gratuite.
        const batchSize = 4
        for (let i = 0; i < pending.length && !cancelled; i += batchSize) {
          const batch = pending.slice(i, i + batchSize)
          const results = await Promise.all(
            batch.map(async ([source]) => [source, await translateText(source, lang)] as const),
          )
          const fresh = readCache()
          for (const [source, translated] of results) {
            if (!translated || translated === source) continue
            fresh[`${lang}::${source}`] = translated
          }
          writeCache(fresh)
          if (cancelled) return
          for (const [source, translated] of results) {
            if (!translated || translated === source) continue
            for (const node of missing.get(source) ?? []) {
              if (node.isConnected) applyTranslation(node, translated)
            }
          }
        }
      } finally {
        running = false
        if (queued && !cancelled) {
          queued = false
          window.setTimeout(() => void run(), 250)
        }
      }
    }

    // Première passe après le rendu, puis à chaque changement de contenu.
    const first = window.setTimeout(() => void run(), 400)
    let timer: number | undefined
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void run(), 500)
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    return () => {
      cancelled = true
      window.clearTimeout(first)
      window.clearTimeout(timer)
      observer.disconnect()
    }
  }, [lang])

  return null
}
