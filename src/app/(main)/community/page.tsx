'use client'

import { Store, Users, UsersRound } from 'lucide-react'
import * as React from 'react'

import { GroupsDirectory } from '@/components/community/GroupsDirectory'
import { MembersPanel } from '@/components/community/MembersPanel'
import { PagesDirectory } from '@/components/community/PagesDirectory'
import { useLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type CommunityTab = 'membres' | 'groupes' | 'pages'

const TAB_IDS: CommunityTab[] = ['membres', 'groupes', 'pages']

function isTab(value: string | null): value is CommunityTab {
  return !!value && (TAB_IDS as string[]).includes(value)
}

/** Lit `?tab=` sans dépendre de `useSearchParams` (pas de Suspense requis). */
function readTab(): CommunityTab {
  if (typeof window === 'undefined') return 'membres'
  const value = new URLSearchParams(window.location.search).get('tab')
  return isTab(value) ? value : 'membres'
}

// `useLayoutEffect` côté client uniquement (aucun avertissement en SSR).
const useIsoLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

/**
 * COMMUNAUTÉ — hub à trois grands sous-onglets (demande produit) :
 * « Les membres », « Les groupes », « Les pages ».
 *
 * L'encart violet n'est pas trois fonds différents : c'est **un seul** bloc
 * qui glisse du sous-onglet quitté vers celui sur lequel on clique (position et
 * largeur mesurées sur le bouton réel, donc parfait à toutes les tailles et en
 * zones sûres). L'onglet actif reste reflété dans l'URL (`?tab=`).
 */
export default function CommunityPage() {
  const { t } = useLang()
  const [tab, setTab] = React.useState<CommunityTab>('membres')
  const [mounted, setMounted] = React.useState(false)

  const listRef = React.useRef<HTMLDivElement | null>(null)
  const btnRefs = React.useRef<Partial<Record<CommunityTab, HTMLButtonElement | null>>>({})
  // Position de l'encart (px, relative au conteneur des onglets).
  const [pill, setPill] = React.useState<{ left: number; width: number } | null>(null)
  // L'animation n'est activée qu'après le premier positionnement, sinon
  // l'encart « glisserait » depuis la gauche au chargement de la page.
  const [canAnimate, setCanAnimate] = React.useState(false)

  React.useEffect(() => {
    setTab(readTab())
    setMounted(true)
  }, [])

  // --- mesure de l'encart sur le bouton actif ---
  const measure = React.useCallback(() => {
    const el = btnRefs.current[tab]
    if (!el) return
    setPill({ left: el.offsetLeft, width: el.offsetWidth })
  }, [tab])

  useIsoLayoutEffect(() => {
    measure()
  }, [measure, mounted])

  // Recalcul au redimensionnement / rotation / chargement des polices.
  const measureRef = React.useRef(measure)
  measureRef.current = measure

  React.useEffect(() => {
    const list = listRef.current
    if (!list) return
    const remeasure = () => measureRef.current()
    const ro = new ResizeObserver(remeasure)
    ro.observe(list)
    window.addEventListener('resize', remeasure)
    window.addEventListener('orientationchange', remeasure)
    void document.fonts?.ready.then(remeasure).catch(() => {})
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', remeasure)
      window.removeEventListener('orientationchange', remeasure)
    }
  }, [])

  React.useEffect(() => {
    if (!pill || !mounted || canAnimate) return
    const id = window.requestAnimationFrame(() => setCanAnimate(true))
    return () => window.cancelAnimationFrame(id)
  }, [pill, mounted, canAnimate])

  const select = (next: CommunityTab) => {
    setTab(next)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', next)
      window.history.replaceState(null, '', url.toString())
    } catch {
      /* historique indisponible : l'onglet reste actif malgré tout */
    }
  }

  // Navigation clavier dans la liste d'onglets (flèches ← →).
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const index = TAB_IDS.indexOf(tab)
    const next = TAB_IDS[(index + (event.key === 'ArrowRight' ? 1 : TAB_IDS.length - 1)) % TAB_IDS.length]!
    select(next)
    btnRefs.current[next]?.focus()
  }

  const TABS = [
    { id: 'membres' as CommunityTab, label: t('community_tab_members'), icon: Users, hint: t('community_members_hint') },
    { id: 'groupes' as CommunityTab, label: t('community_tab_groups'), icon: UsersRound, hint: t('community_groups_hint') },
    { id: 'pages' as CommunityTab, label: t('community_tab_pages'), icon: Store, hint: t('community_pages_hint') },
  ]

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">{t('community_title')}</h1>
        <p className="text-sm text-fg-muted">{t('community_subtitle')}</p>
      </header>

      {/* Trois grands sous-onglets — encart violet coulissant */}
      <div
        ref={listRef}
        role="tablist"
        aria-label={t('community_title')}
        onKeyDown={onKeyDown}
        className="relative grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-1.5"
      >
        {/* L'encart : un seul bloc, qui glisse latéralement */}
        {pill && (
          <span
            aria-hidden
            className={cn(
              'community-pill pointer-events-none absolute inset-y-1.5 left-0 rounded-xl bg-primary-600 shadow-md shadow-primary-600/30',
              canAnimate && mounted && 'community-pill--animate',
            )}
            style={{ width: pill.width, transform: `translate3d(${pill.left}px,0,0)` }}
          />
        )}

        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              ref={(node) => {
                btnRefs.current[id] = node
              }}
              type="button"
              role="tab"
              id={`community-tab-${id}`}
              aria-selected={active}
              aria-controls={`community-panel-${id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => select(id)}
              className={cn(
                'community-tab relative z-10 flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-xl bg-transparent px-1 py-2 text-[12px] font-bold sm:text-sm',
                active ? 'text-white' : 'text-fg-muted',
                // Avant la mesure (rendu serveur), l'onglet actif porte lui-même
                // le violet : aucun clignotement au chargement.
                active && !pill && 'bg-primary-600 shadow-md shadow-primary-600/25',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span className="max-w-full truncate">{label}</span>
            </button>
          )
        })}
      </div>

      <p className="text-xs font-medium text-fg-muted">
        {TABS.find((x) => x.id === tab)?.hint}
      </p>

      <div
        role="tabpanel"
        id={`community-panel-${tab}`}
        aria-labelledby={`community-tab-${tab}`}
        key={tab}
        className="community-panel-in min-w-0"
      >
        {mounted && tab === 'membres' && <MembersPanel embedded />}
        {mounted && tab === 'groupes' && <GroupsDirectory embedded />}
        {mounted && tab === 'pages' && <PagesDirectory embedded />}
      </div>
    </div>
  )
}
