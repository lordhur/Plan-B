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
        <ul className="grid gap-4 sm:grid-cols-2">
          {groups.data.map((group) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.slug}`}
                className="sheen-hover lift-shadow group relative block overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card"
              >
                {/* Visuel de couverture */}
                <span className="relative block aspect-[21/9] w-full overflow-hidden [contain:paint]">
                  {group.coverImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={group.coverImage}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out will-change-transform [backface-visibility:hidden] group-hover:scale-[1.05]"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          'radial-gradient(120% 100% at 15% 10%, #8b5cf666, transparent 55%), radial-gradient(100% 120% at 85% 90%, #22d3ee44, transparent 55%), linear-gradient(135deg, #8b5cf62e, #0f172a14 60%, #8b5cf61f)',
                      }}
                    />
                  )}
                  <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-card via-card/55 to-transparent" />
                  <span className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
                    <span className="min-w-0 truncate text-base font-bold">{group.name}</span>
                    <span className="shrink-0 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md">
                      {group.memberCount} 👥
                    </span>
                  </span>
                </span>
                <span className="block p-4 pt-2.5">
                  <span className="block text-xs font-medium text-primary-600">
                    {CATEGORY_LABELS[group.category] ?? group.category}
                  </span>
                  {group.description && (
                    <span className="mt-1 line-clamp-2 block text-sm text-fg-muted">{group.description}</span>
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
