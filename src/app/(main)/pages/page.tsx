'use client'

import { BadgeCheck, Plus, Search, Store } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const CATEGORY_LABELS: Record<string, string> = {
  commerce: 'Commerce',
  association: 'Association',
  salle: 'Salle / lieu',
  restaurant: 'Restaurant',
  sport: 'Sport',
  culture: 'Culture',
  autre: 'Autre',
}

/** Annuaire des pages organisateurs & commerces (spec Phase 5 §5.1). */
export default function PagesDirectoryPage() {
  const [search, setSearch] = useState('')
  const pages = trpc.pages.list.useQuery(search ? { search } : undefined)

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-0">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <Store className="h-6 w-6 text-primary-600" aria-hidden /> Pages
          </h1>
          <p className="text-sm text-fg-muted">Commerces, associations et lieux qui organisent des plans.</p>
        </div>
        <Button asChild>
          <Link href="/pages/new">
            <Plus className="h-4 w-4" aria-hidden /> Créer une page
          </Link>
        </Button>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" aria-hidden />
        <Input
          type="search"
          aria-label="Rechercher une page"
          placeholder="Rechercher (nom, ville…)"
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {pages.isLoading ? (
        <LoadingSpinner label="Chargement des pages" />
      ) : !pages.data || pages.data.length === 0 ? (
        <EmptyState icon={Store} title="Aucune page trouvée" description="Créez la page de votre commerce ou association !" />
      ) : (
        <ul className="space-y-3">
          {pages.data.map((page) => (
            <li key={page.id}>
              <Link
                href={`/pages/${page.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-card-hover"
              >
                <Avatar src={page.avatarUrl} name={page.name} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="truncate">{page.name}</span>
                    {page.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary-600" aria-label="Page vérifiée" />}
                  </span>
                  <span className="block truncate text-xs text-fg-muted">
                    {CATEGORY_LABELS[page.category] ?? page.category}
                    {page.city ? ` · ${page.city}` : ''} · {page.followerCount} abonné(s) · {page._count.events} plan(s)
                  </span>
                  {page.description && (
                    <span className="mt-1 block truncate text-sm text-fg-muted">{page.description}</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
