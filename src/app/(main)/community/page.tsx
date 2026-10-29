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

/**
 * COMMUNAUTÉ — hub à trois grands sous-onglets (demande produit) :
 * « Les membres », « Les groupes », « Les pages ».
 *
 * Chaque sous-onglet réutilise l'annuaire existant (aucune fonction perdue) ;
 * l'onglet actif est reflété dans l'URL (`?tab=`), donc partageable et
 * conservé au rechargement.
 */
export default function CommunityPage() {
  const { t } = useLang()
  const [tab, setTab] = React.useState<CommunityTab>('membres')
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    setTab(readTab())
    setReady(true)
  }, [])

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

      {/* Trois grands sous-onglets */}
      <div
        role="tablist"
        aria-label={t('community_title')}
        className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-card p-1.5"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`community-tab-${id}`}
              aria-selected={active}
              aria-controls={`community-panel-${id}`}
              onClick={() => select(id)}
              className={cn(
                'flex min-h-[3.25rem] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[12px] font-bold transition-all duration-200 sm:text-sm',
                active
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
                  : 'text-fg-muted hover:bg-bg-secondary hover:text-fg',
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
        className="min-w-0"
      >
        {ready && tab === 'membres' && <MembersPanel embedded />}
        {ready && tab === 'groupes' && <GroupsDirectory embedded />}
        {ready && tab === 'pages' && <PagesDirectory embedded />}
      </div>
    </div>
  )
}
