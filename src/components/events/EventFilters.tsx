'use client'

import { SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

export interface Filters {
  categoryId?: string
  maxDistanceKm?: number
  isFree?: boolean
  wheelchairAccessible?: boolean
  dateFrom?: string
  dateTo?: string
  sort: 'relevance' | 'date' | 'distance' | 'popularity'
}

interface EventFiltersProps {
  filters: Filters
  onChange: (filters: Filters) => void
  hasLocation: boolean
}

/** Filtres de la page Explorer : catégorie, distance, prix, accessibilité, date. */
export function EventFilters({ filters, onChange, hasLocation }: EventFiltersProps) {
  const [open, setOpen] = useState(false)
  const { data: categories } = trpc.events.categories.useQuery()
  const distance = filters.maxDistanceKm ?? 25

  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const activeCount =
    (filters.categoryId ? 1 : 0) +
    (filters.isFree ? 1 : 0) +
    (filters.wheelchairAccessible ? 1 : 0) +
    (filters.maxDistanceKm && filters.maxDistanceKm !== 25 ? 1 : 0) +
    (filters.dateFrom || filters.dateTo ? 1 : 0)

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-44 flex-1">
          <label htmlFor="filter-category" className="sr-only">
            Catégorie
          </label>
          <Select
            id="filter-category"
            value={filters.categoryId ?? ''}
            onChange={(e) => update({ categoryId: e.target.value || undefined })}
          >
            <option value="">Toutes les catégories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="min-w-40 flex-1">
          <label htmlFor="filter-sort" className="sr-only">
            Trier par
          </label>
          <Select
            id="filter-sort"
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value as Filters['sort'] })}
          >
            <option value="relevance">Pertinence</option>
            <option value="date">Date</option>
            <option value="distance">Distance</option>
            <option value="popularity">Popularité</option>
          </Select>
        </div>

        <Button variant="secondary" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filtres
          {activeCount > 0 && (
            <span className="rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      {open && (
        <div className="animate-slide-up mt-4 space-y-5 border-t border-border pt-4">
          {hasLocation ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label htmlFor="filter-distance">Distance max</Label>
                <span className="text-sm font-semibold text-primary-600">{distance} km</span>
              </div>
              <Slider
                id="filter-distance"
                min={1}
                max={100}
                step={1}
                value={[distance]}
                onValueChange={([v]) => update({ maxDistanceKm: v })}
                aria-label="Distance maximale en kilomètres"
              />
            </div>
          ) : (
            <p className="text-xs text-fg-muted">
              💡 Autorisez la géolocalisation pour filtrer par distance autour de vous.
            </p>
          )}

          <div>
            <Label htmlFor="filter-date-from" className="mb-2 block">
              Période
            </Label>
            <div className="flex items-center gap-2">
              <input
                id="filter-date-from"
                type="date"
                value={filters.dateFrom ?? ''}
                onChange={(e) => update({ dateFrom: e.target.value || undefined })}
                className="h-11 flex-1 rounded-xl border border-border bg-bg px-3 text-sm"
              />
              <span aria-hidden className="text-fg-muted">→</span>
              <input
                id="filter-date-to"
                type="date"
                value={filters.dateTo ?? ''}
                onChange={(e) => update({ dateTo: e.target.value || undefined })}
                className="h-11 flex-1 rounded-xl border border-border bg-bg px-3 text-sm"
                aria-label="Date de fin"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="filter-free">Gratuit uniquement</Label>
            <Switch
              id="filter-free"
              checked={filters.isFree ?? false}
              onCheckedChange={(v) => update({ isFree: v || undefined })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="filter-access">Accessible PMR</Label>
            <Switch
              id="filter-access"
              checked={filters.wheelchairAccessible ?? false}
              onCheckedChange={(v) => update({ wheelchairAccessible: v || undefined })}
            />
          </div>

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange({ sort: filters.sort })
              }
            >
              <X className="h-4 w-4" aria-hidden /> Réinitialiser les filtres
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
