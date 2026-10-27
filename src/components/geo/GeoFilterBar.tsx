'use client'

import { Crosshair, Loader2, MapPin, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { searchCities } from '@/lib/frenchCities'
import { useLang } from '@/lib/i18n'
import {
  DEFAULT_RADIUS_KM,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  syncGeoFromStorage,
  useLocationFilter,
} from '@/lib/locationFilter'
import { cn } from '@/lib/utils'

/**
 * Paramètres géographiques prêts pour tRPC, dérivés de la jauge partagée.
 * `radiusKm` est TOUJOURS la valeur courante de la jauge (jamais 25 par défaut).
 */
export function useGeoQuery() {
  const filter = useLocationFilter((s) => s.filter)
  const radiusKm = useLocationFilter((s) => s.radiusKm)

  // Le rayon/la zone choisis ailleurs (carte, fil) sont restaurés à l'arrivée.
  useEffect(() => {
    syncGeoFromStorage()
  }, [])

  return useMemo(() => {
    if (!filter) return { radiusKm }
    if (filter.type === 'city') {
      return { lat: filter.lat, lon: filter.lon, radiusKm }
    }
    return {
      minLat: filter.bbox.minLat,
      maxLat: filter.bbox.maxLat,
      minLon: filter.bbox.minLon,
      maxLon: filter.bbox.maxLon,
      radiusKm,
    }
  }, [filter, radiusKm])
}

/** Libellé court de la zone active. */
export function useZoneLabel(): string | null {
  const filter = useLocationFilter((s) => s.filter)
  return filter?.name ?? null
}

/**
 * Filtre de géolocalisation : ville de recherche + rayon en km.
 * Le rayon est la MÊME jauge que la carte et le fil d'actualité (store partagé),
 * donc la valeur choisie ici s'applique partout (membres, groupes, pages, événements).
 */
export function GeoFilterBar({
  className,
  compact = false,
  resultLabel,
}: {
  className?: string
  compact?: boolean
  /** Ex. « 12 membres dans ce rayon » */
  resultLabel?: string
}) {
  const { t } = useLang()
  const filter = useLocationFilter((s) => s.filter)
  const radiusKm = useLocationFilter((s) => s.radiusKm)
  const setFilter = useLocationFilter((s) => s.setFilter)
  const setRadiusKm = useLocationFilter((s) => s.setRadiusKm)
  const clear = useLocationFilter((s) => s.clear)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => (open ? searchCities(query, 6) : []), [open, query])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const useMyPosition = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError(t('geo_position_unavailable'))
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFilter({
          type: 'city',
          name: 'Ma position',
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        })
        setLocating(false)
        setOpen(false)
      },
      () => {
        setGeoError(t('geo_position_error'))
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    )
  }

  const zoneName = filter?.name ?? null

  return (
    <div
      className={cn(
        'rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900',
        compact ? 'space-y-2' : 'space-y-3',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[190px]" ref={boxRef}>
          <MapPin
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-600 dark:text-primary-400"
            aria-hidden
          />
          <input
            type="text"
            value={open ? query : zoneName ?? ''}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              setQuery('')
              setOpen(true)
            }}
            placeholder={t('geo_city_ph')}
            aria-label={t('geo_city_aria')}
            className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-9 text-sm font-medium text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          {zoneName && (
            <button
              type="button"
              onClick={() => {
                clear()
                setQuery('')
              }}
              aria-label={t('geo_clear_city')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}

          {open && (
            <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
              {suggestions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-neutral-500">
                  {t('geo_type_hint')}
                </p>
              ) : (
                suggestions.map((c) => (
                  <button
                    key={`${c.name}-${c.dept}`}
                    type="button"
                    onClick={() => {
                      setFilter({ type: 'city', name: c.name, lat: c.lat, lon: c.lon })
                      setOpen(false)
                      setQuery('')
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-primary-50 dark:hover:bg-primary-500/10"
                  >
                    <span className="inline-flex items-center gap-2 font-medium text-neutral-800 dark:text-neutral-100">
                      <Search className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
                      {c.name}
                    </span>
                    <span className="text-xs text-neutral-500">({c.dept})</span>
                  </button>
                ))
              )}
              <button
                type="button"
                onClick={useMyPosition}
                className="mt-1 flex w-full items-center gap-2 border-t border-neutral-100 px-3 py-2 text-left text-sm font-semibold text-primary-700 hover:bg-primary-50 dark:border-neutral-800 dark:text-primary-300 dark:hover:bg-primary-500/10"
              >
                {locating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Crosshair className="h-3.5 w-3.5" aria-hidden />
                )}
                {t('geo_use_position')}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 dark:bg-neutral-800">
          <label htmlFor="geo-radius" className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            {t('geo_radius')}
          </label>
          <input
            id="geo-radius"
            type="range"
            min={MIN_RADIUS_KM}
            max={MAX_RADIUS_KM}
            step={1}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            aria-valuetext={`${radiusKm} kilomètres`}
            className="h-2 w-28 cursor-pointer appearance-none rounded-full bg-neutral-300 accent-primary-600 dark:bg-neutral-600 sm:w-36"
          />
          <span className="min-w-[3.75rem] rounded-lg bg-primary-600 px-2 py-1 text-center text-xs font-bold text-white tabular-nums">
            {radiusKm} km
          </span>
        </div>

        <button
          type="button"
          onClick={() => setRadiusKm(DEFAULT_RADIUS_KM)}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-neutral-500 underline-offset-2 hover:text-primary-700 hover:underline dark:hover:text-primary-300"
          aria-label={t('geo_reset_radius').replace('{km}', String(DEFAULT_RADIUS_KM))}
        >
          {DEFAULT_RADIUS_KM} km
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1 font-medium text-neutral-600 dark:text-neutral-300">
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          {zoneName ? (
            filter?.type === 'region' || filter?.type === 'dept' ? (
              <>{t('geo_zone').replace('{zone}', zoneName)}</>
            ) : (
              <>{t('geo_around').replace('{city}', zoneName).replace('{km}', String(radiusKm))}</>
            )
          ) : (
            <>{t('geo_none').replace('{km}', String(radiusKm))}</>
          )}
        </span>
        {resultLabel && <span className="font-semibold text-primary-700 dark:text-primary-300">{resultLabel}</span>}
      </div>
      {geoError && <p className="text-xs font-medium text-red-600">{geoError}</p>}
    </div>
  )
}
