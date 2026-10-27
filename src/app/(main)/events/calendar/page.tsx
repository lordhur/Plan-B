'use client'

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { fr } from 'date-fns/locale'
import { Activity, Archive, CalendarDays, Camera, ChevronLeft, ChevronRight, List, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/utils'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { useLang } from '@/lib/i18n'

/** Coordonnées par défaut : Toulon (centre du Var). */
const DEFAULT_LAT = 43.1242
const DEFAULT_LON = 5.928

/** Codes WMO Open-Meteo → emoji + libellé. */
function weatherMeta(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: '☀️', label: 'Ensoleillé' }
  if (code <= 2) return { icon: '⛅', label: 'Éclaircies' }
  if (code === 3) return { icon: '☁️', label: 'Couvert' }
  if (code === 45 || code === 48) return { icon: '🌫️', label: 'Brouillard' }
  if (code <= 57) return { icon: '🌦️', label: 'Bruine' }
  if (code <= 67) return { icon: '🌧️', label: 'Pluie' }
  if (code <= 77) return { icon: '🌨️', label: 'Neige' }
  if (code <= 82) return { icon: '🌧️', label: 'Averses' }
  if (code <= 86) return { icon: '🌨️', label: 'Neige' }
  return { icon: '⛈️', label: 'Orages' }
}

interface HourWeather {
  time: string
  temp: number
  code: number
}

/** Prévisions matin (8 h) / après-midi (14 h) / soir (20 h) via Open-Meteo (gratuit, sans clé). */
function useWeather(lat: number, lon: number) {
  const [byDate, setByDate] = useState<Map<string, { matin: HourWeather; aprem: HourWeather; soir: HourWeather }>>(
    () => new Map(),
  )
  const [hourly, setHourly] = useState<Map<string, HourWeather[]>>(() => new Map())
  const [tick, setTick] = useState(0)

  // Rafraîchissement régulier (toutes les 15 min)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 15 * 60_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let cancelled = false
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      '&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=7'

    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { hourly?: { time: string[]; temperature_2m: number[]; weather_code: number[] } } | null) => {
        if (cancelled || !data?.hourly) return
        const map = new Map<string, { matin: HourWeather; aprem: HourWeather; soir: HourWeather }>()
        const h = data.hourly
        const times = h.time ?? []
        const temps = h.temperature_2m ?? []
        const codes = h.weather_code ?? []
        for (let i = 0; i < times.length; i++) {
          const t = times[i]
          const temp = temps[i]
          const code = codes[i]
          if (!t || temp == null || code == null) continue
          const date = t.slice(0, 10)
          const hour = t.slice(11, 13)
          const entry = { time: t, temp, code }
          const day = map.get(date) ?? ({} as { matin?: HourWeather; aprem?: HourWeather; soir?: HourWeather })
          if (hour === '08') day.matin = entry
          if (hour === '14') day.aprem = entry
          if (hour === '20') day.soir = entry
          if (day.matin && day.aprem && day.soir)
            map.set(date, day as { matin: HourWeather; aprem: HourWeather; soir: HourWeather })
        }
        setByDate(map)
        // Toutes les heures par date (pour la météo à l'heure exacte d'un plan)
        const all = new Map<string, HourWeather[]>()
        for (let i = 0; i < times.length; i++) {
          const t = times[i]
          const temp = temps[i]
          const code = codes[i]
          if (!t || temp == null || code == null) continue
          const d = t.slice(0, 10)
          const arr = all.get(d) ?? []
          arr.push({ time: t, temp, code })
          all.set(d, arr)
        }
        setHourly(all)
      })
      .catch(() => {
        /* météo indisponible : on ignore silencieusement */
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon, tick])

  return { byDate, hourly }
}

/** Météo à l'heure d'un événement (heure la plus proche). */
function weatherAt(hourly: Map<string, HourWeather[]>, date: Date) {
  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const arr = hourly.get(key)
  const first = arr?.[0]
  if (!first) return null
  const h = date.getHours()
  let best = first
  for (const w of arr ?? []) {
    if (Math.abs(Number(w.time.slice(11, 13)) - h) < Math.abs(Number(best.time.slice(11, 13)) - h)) best = w
  }
  return weatherMeta(best.code)
}

/** Bloc météo d'un jour : matin · après-midi · soir. */
function DayWeather({
  day,
  weather,
}: {
  day: string
  weather: Map<string, { matin: HourWeather; aprem: HourWeather; soir: HourWeather }>
}) {
  const w = weather.get(day)
  if (!w) return null
  const slots: { label: string; value: HourWeather }[] = [
    { label: 'Matin', value: w.matin },
    { label: 'Après-midi', value: w.aprem },
    { label: 'Soir', value: w.soir },
  ]
  return (
    <div
      className="flex shrink-0 gap-3 rounded-xl border border-border bg-bg-secondary/60 px-3 py-2 text-center"
      aria-label="Prévisions météo du jour"
    >
      {slots.map((s) => {
        const meta = weatherMeta(s.value.code)
        return (
          <div key={s.label} className="min-w-12" title={`${s.label} : ${meta.label}`}>
            <div className="text-[10px] font-bold uppercase tracking-wide text-fg-muted">{s.label.slice(0, 4)}</div>
            <div className="text-base leading-tight" aria-hidden>
              {meta.icon}
            </div>
            <div className="text-xs font-bold tabular-nums">{Math.round(s.value.temp)}°</div>
          </div>
        )
      })}
    </div>
  )
}

type EventRow = {
  id: string
  slug: string
  title: string
  startDate: Date
  city: string
  price: number | null
  currentParticipants: number
  maxParticipants: number | null
  category: { slug: string; name: string; icon: string; color: string }
  coverImage: string | null
  organizer: { id: string; firstName: string; lastName: string; displayName: string | null } | null
}

/**
 * Ligne d'événement compacte : image en fond sur toute la ligne, long dégradé
 * naturel vers la couleur de la catégorie, encart heure collé à gauche
 * (10 px de marge) sur quasi toute la hauteur, textes avec ombre portée.
 * Ordre : heure → icône catégorie → titre → ville + organisateur → inscrits.
 */
function EventRowLink({
  e,
  weather,
}: {
  e: EventRow
  weather?: { icon: string; label: string } | null
}) {
  const org = e.organizer
  const orgName = org ? org.displayName || `${org.firstName} ${org.lastName}` : 'PlanB'
  const color = e.category.color

  return (
    <li>
      <Link
        href={`/events/${e.slug}`}
        className="relative flex min-h-[84px] items-stretch overflow-hidden rounded-xl border border-border shadow-sm transition-shadow hover:shadow-card-hover"
      >
        {/* Image en fond sur toute la largeur */}
        {e.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={e.coverImage}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span
            className="absolute inset-0 flex items-center justify-center text-5xl opacity-25"
            style={{ backgroundColor: `${color}22` }}
            aria-hidden
          >
            <CategoryIcon name={e.category.icon} className="h-10 w-10" />
          </span>
        )}

        {/* Long dégradé naturel vers la couleur unie de la catégorie */}
        <span
          className="absolute inset-0"
          aria-hidden
          style={{
            background: `linear-gradient(90deg, rgba(0,0,0,0.25) 0%, ${color}00 18%, ${color}A6 55%, ${color} 78%)`,
          }}
        />

        {/* Encart heure : à gauche, quasi toute la hauteur, 10 px de marge */}
        <span
          className="relative z-10 m-[10px] flex w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-black/60 backdrop-blur-sm"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          <span className="text-base font-black leading-none tabular-nums text-white sm:text-lg">
            {format(e.startDate, 'HH:mm')}
          </span>
        </span>

        {/* Contenu : icône → titre → ville + organisateur → inscrits */}
        <span
          className="relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-2 pr-3 text-white"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.65)' }}
        >
          <span className="flex items-center gap-1.5">
            <CategoryIcon name={e.category.icon} className="h-4 w-4 shrink-0" />
            <span className="truncate text-sm font-bold leading-tight">{e.title}</span>
          </span>
          <span className="truncate text-xs font-medium opacity-95">
            {e.city} · par {orgName}
          </span>
          <span className="flex items-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white/20 px-2 py-0.5">
              {e.currentParticipants}
              {e.maxParticipants != null ? `/${e.maxParticipants}` : ''} inscrits
            </span>
            <span>{e.price != null && e.price > 0 ? `${e.price.toFixed(2)} €` : 'Gratuit'}</span>
          </span>
        </span>
      </Link>
    </li>
  )
}

type SubTab = 'evenements' | 'calendrier' | 'archive'

/** Sous-onglet Archive — toutes les activités passées (souvenirs photos/vidéos). */
function ArchiveSection() {
  const archive = trpc.events.archive.useQuery()

  if (archive.isLoading) return <LoadingSpinner label="Chargement de l'archive" />
  const events = archive.data ?? []
  if (events.length === 0) {
    return (
      <EmptyState
        icon={Archive}
        title="Aucune activité passée"
        description="Vos souvenirs s'accumuleront ici après vos premières sorties."
      />
    )
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">
        Toutes vos activités passées — ajoutez vos photos et vidéos souvenirs depuis l’album de
        chaque plan.
      </p>
      <ul className="space-y-2">
        {events.map((e) => {
          const date = new Date(e.startDate)
          const mediaCount = e.album?._count?.media ?? 0
          return (
            <li key={e.id}>
              <Link
                href={`/events/${e.slug}/photos`}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition-colors hover:border-primary-300"
              >
                <span className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-bg-secondary py-1.5">
                  <span className="text-[10px] font-black uppercase text-fg-muted">
                    {format(date, 'MMM', { locale: fr })}
                  </span>
                  <span className="text-sm font-extrabold leading-none">{format(date, 'd')}</span>
                  <span className="text-[10px] font-semibold text-fg-muted">
                    {format(date, 'yyyy')}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center"
                      style={{ color: e.category?.color ?? '#7c3aed' }}
                      aria-hidden
                    >
                      <CategoryIcon name={e.category?.icon ?? 'autres'} className="h-4 w-4" />
                    </span>
                    <span className="truncate">{e.title}</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-fg-muted">
                    <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                    <span className="truncate">
                      {e.city}
                      {e.liked ? ' · ❤️' : ''}
                    </span>
                  </span>
                </span>
                {mediaCount > 0 ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary-50 px-2 py-1 text-[11px] font-bold text-secondary-600 dark:bg-secondary-500/10 dark:text-secondary-300">
                    <Camera className="h-3.5 w-3.5" aria-hidden />
                    {mediaCount}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-dashed border-border px-2 py-1 text-[11px] font-semibold text-fg-muted">
                    + photos
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Page « Activité » — lignes d'événements + calendrier mensuel. */
export default function ActivitePage() {
  const { t: tl } = useLang()
  const { user } = useCurrentUser()
  const [sub, setSub] = useState<SubTab>('evenements')
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState<Date | null>(() => new Date())

  const range = useMemo(() => ({ from: startOfMonth(month), to: endOfMonth(month) }), [month])
  const events = trpc.events.inRange.useQuery({ from: range.from, to: range.to })

  const { byDate: weatherByDate, hourly } = useWeather(
    user?.latitude ?? DEFAULT_LAT,
    user?.longitude ?? DEFAULT_LON,
  )

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, NonNullable<typeof events.data>>()
    for (const e of events.data ?? []) {
      const key = format(e.startDate, 'yyyy-MM-dd')
      const list = map.get(key)
      if (list) list.push(e)
      else map.set(key, [e])
    }
    return map
  }, [events.data])

  const daysWithEvents = useMemo(
    () => [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)),
    [byDay],
  )

  const today = new Date()
  const selectedEvents = selected ? byDay.get(format(selected, 'yyyy-MM-dd')) ?? [] : []

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-0">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <Activity className="h-6 w-6 text-primary-600" aria-hidden /> Activité
          </h1>
          <p className="text-sm text-fg-muted">Tout ce qui se passe près de chez vous.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Mois précédent" onClick={() => setMonth((m) => addMonths(m, -1))}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <span aria-live="polite" className="min-w-40 text-center font-semibold capitalize">
            {format(month, 'MMMM yyyy', { locale: fr })}
          </span>
          <Button variant="outline" size="icon" aria-label="Mois suivant" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </header>

      {/* Sous-onglets en boutons */}
      <nav className="flex flex-wrap gap-2" aria-label="Onglets Activité">
        {[
          { id: 'evenements' as const, label: tl('activity_tab_events'), icon: List },
          { id: 'calendrier' as const, label: tl('activity_tab_calendar'), icon: CalendarDays },
          { id: 'archive' as const, label: tl('activity_tab_archive'), icon: Archive },
        ].map((tabDef) => (
          <button
            key={tabDef.id}
            type="button"
            aria-current={sub === tabDef.id ? 'true' : undefined}
            onClick={() => setSub(tabDef.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-sm transition-colors',
              sub === tabDef.id
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-border bg-card text-fg-muted hover:border-primary-300 hover:text-fg',
            )}
          >
            <tabDef.icon className="h-4 w-4" aria-hidden />
            {tabDef.label}
          </button>
        ))}
      </nav>

      {/* ---------- ÉVÉNEMENTS : toutes les lignes d'affilée ---------- */}
      {sub === 'evenements' &&
        (events.isLoading ? (
          <LoadingSpinner label="Chargement des événements" />
        ) : daysWithEvents.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Aucun plan ce mois-ci"
            description="Changez de mois ou créez votre propre plan !"
          />
        ) : (
          <div className="space-y-6">
            {daysWithEvents.map(([dayKey, dayEvents]) => {
              const first = dayEvents[0]
              if (!first) return null
              const date = first.startDate
              const isToday = isSameDay(date, today)
              return (
                <section key={dayKey} aria-label={`Plans du ${format(date, 'd MMMM', { locale: fr })}`}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-extrabold tracking-tight capitalize">
                      {format(date, 'EEEE d', { locale: fr })}
                      {isToday && (
                        <span className="ml-2 rounded-full bg-primary-600 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-white">
                          Aujourd’hui
                        </span>
                      )}
                    </h2>
                    <DayWeather day={dayKey} weather={weatherByDate} />
                  </div>
                  <ul className="space-y-2">
                    {dayEvents.map((e) => (
                      <EventRowLink
                        key={e.id}
                        e={e}
                        weather={weatherAt(hourly, new Date(e.startDate))}
                      />
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        ))}

      {/* ---------- ARCHIVE : activités passées, souvenirs photos/vidéos ---------- */}
      {sub === 'archive' && <ArchiveSection />}

      {/* ---------- CALENDRIER : grille mensuelle ---------- */}
      {sub === 'calendrier' &&
        (events.isLoading ? (
          <LoadingSpinner label="Chargement du calendrier" />
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="grid grid-cols-7 border-b border-border bg-bg-secondary text-center text-[11px] font-semibold uppercase text-fg-muted">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                  <div key={d} className="py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day) => {
                  const dayEvents = byDay.get(format(day, 'yyyy-MM-dd')) ?? []
                  const isSelected = selected ? isSameDay(day, selected) : false
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelected(day)}
                      aria-label={`${format(day, 'd MMMM', { locale: fr })}${dayEvents.length > 0 ? ` — ${dayEvents.length} plan(s)` : ''}`}
                      aria-pressed={isSelected}
                      className={cn(
                        'flex min-h-16 flex-col items-center gap-1 border-b border-r border-border p-1.5 text-sm transition-colors last:border-r-0',
                        !isSameMonth(day, month) && 'opacity-40',
                        isSelected ? 'bg-primary-50 dark:bg-primary-950' : 'hover:bg-bg-secondary',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                          isSameDay(day, today) && 'bg-primary-600 text-white',
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="flex gap-0.5" aria-hidden>
                          {dayEvents.slice(0, 3).map((e) => (
                            <span
                              key={e.id}
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: e.category.color }}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <section aria-labelledby="day-events-title">
              <h2 id="day-events-title" className="mb-3 flex flex-wrap items-center justify-between gap-2 font-semibold capitalize">
                <span>{selected ? format(selected, 'EEEE d MMMM', { locale: fr }) : 'Sélectionnez un jour'}</span>
                {selected && <DayWeather day={format(selected, 'yyyy-MM-dd')} weather={weatherByDate} />}
              </h2>
              {selectedEvents.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Aucun plan ce jour-là"
                  description="Changez de date ou créez votre propre plan !"
                />
              ) : (
                <ul className="space-y-2">
                  {selectedEvents.map((e) => (
                    <EventRowLink
                      key={e.id}
                      e={e}
                      weather={weatherAt(hourly, new Date(e.startDate))}
                    />
                  ))}
                </ul>
              )}
            </section>
          </>
        ))}
    </div>
  )
}
