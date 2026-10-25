'use client'

import { Plus, Search, Users } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const CATEGORY_LABELS: Record<string, string> = {
  sport: 'Sport',
  nature: 'Nature',
  culture: 'Culture',
  food: 'Gastronomie',
  jeux: 'Jeux',
  voyage: 'Voyage',
  parentalité: 'Parentalité',
  autre: 'Autre',
}

/** Annuaire des groupes d'intérêt (spec Phase 5 §5.2). */
export default function GroupsDirectoryPage() {
  const [search, setSearch] = useState('')
  const groups = trpc.groups.list.useQuery(search ? { search } : undefined)

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-0">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <Users className="h-6 w-6 text-primary-600" aria-hidden /> Groupes
          </h1>
          <p className="text-sm text-fg-muted">Rejoignez des passionnés et discutez sur le forum.</p>
        </div>
        <Button asChild>
          <Link href="/groups/new">
            <Plus className="h-4 w-4" aria-hidden /> Créer un groupe
          </Link>
        </Button>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" aria-hidden />
        <Input
          type="search"
          aria-label="Rechercher un groupe"
          placeholder="Rechercher un groupe…"
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {groups.isLoading ? (
        <LoadingSpinner label="Chargement des groupes" />
      ) : !groups.data || groups.data.length === 0 ? (
        <EmptyState icon={Users} title="Aucun groupe trouvé" description="Créez le premier groupe de votre passion !" />
      ) : (
        <ul className="space-y-3">
          {groups.data.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.slug}`}
                className="block rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-card-hover"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{group.name}</span>
                    <span className="block text-xs text-fg-muted">
                      {CATEGORY_LABELS[group.category] ?? group.category} · {group.memberCount} membre(s)
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-950 dark:text-primary-300">
                    {group.memberCount} 👥
                  </span>
                </span>
                {group.description && <span className="mt-2 block text-sm text-fg-muted">{group.description}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
