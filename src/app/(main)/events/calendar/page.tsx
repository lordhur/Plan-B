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
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/utils'

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
          if (day.matin && day.aprem && day.soir) map.set(date, day as { matin: HourWeather; aprem: HourWeather; soir: HourWeather })
        }
        setByDate(map)
      })
      .catch(() => {
        /* météo indisponible : on ignore silencieusement */
      })

    return () => {
      cancelled = true
    }
  }, [lat, lon])

  return byDate
}

/** Bloc météo d'un jour : matin · après-midi · soir. */
function DayWeather({ day, weather }: { day: string; weather: Map<string, { matin: HourWeather; aprem: HourWeather; soir: HourWeather }> }) {
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

/** Calendrier des plans — chronologie par jour + météo matin/après-midi/soir. */
export default function CalendarPage() {
  const { user } = useCurrentUser()
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState<Date | null>(() => new Date())

  const range = useMemo(() => ({ from: startOfMonth(month), to: endOfMonth(month) }), [month])
  const events = trpc.events.inRange.useQuery({ from: range.from, to: range.to })

  const weather = useWeather(user?.latitude ?? DEFAULT_LAT, user?.longitude ?? DEFAULT_LON)

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month],
  )

  // Regroupement chronologique par jour
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-0">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Calendrier des plans</h1>
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

      {/* Grille compacte du mois */}
      {events.isLoading ? (
        <LoadingSpinner label="Chargement du calendrier" />
      ) : (
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
                  onClick={() => {
                    setSelected(day)
                    document.getElementById(`day-${format(day, 'yyyy-MM-dd')}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
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
                        <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: e.category.color }} />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Chronologie par jour */}
      {events.isLoading ? null : daysWithEvents.length === 0 ? (
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
              <section key={dayKey} id={`day-${dayKey}`} aria-label={`Plans du ${format(date, 'd MMMM', { locale: fr })}`}>
                {/* En-tête du jour + météo à droite */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-extrabold tracking-tight capitalize">
                    {format(date, 'EEEE d', { locale: fr })}
                    {isToday && (
                      <span className="ml-2 rounded-full bg-primary-600 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-white">
                        Aujourd’hui
                      </span>
                    )}
                  </h2>
                  <DayWeather day={dayKey} weather={weather} />
                </div>

                {/* Lignes chronologiques : heure · titre · places · organisateur */}
                <ul className="space-y-2">
                  {dayEvents.map((e) => {
                    const org = e.organizer
                    const orgName = org ? org.displayName || `${org.firstName} ${org.lastName}` : 'PlanB'
                    return (
                      <li key={e.id}>
                        <Link
                          href={`/events/${e.slug}`}
                          className="card-sheen flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition-shadow hover:shadow-card-hover"
                        >
                          {/* Vignette : photo de couverture ou icône catégorie */}
                          {e.coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={e.coverImage}
                              alt=""
                              loading="lazy"
                              className="h-14 w-14 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <span
                              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-xl"
                              style={{ backgroundColor: `${e.category.color}22` }}
                              aria-hidden
                            >
                              {e.category.icon}
                            </span>
                          )}

                          <span className="shrink-0 font-bold tabular-nums text-fg-muted sm:w-12">
                            {format(e.startDate, 'HH:mm')}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">
                              <span
                                className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                                style={{ backgroundColor: e.category.color }}
                                aria-hidden
                              />
                              {e.title}
                              <span className="ml-1.5 text-xs font-normal text-fg-muted">— {e.city}</span>
                            </span>
                            <span className="block truncate text-xs text-fg-muted">
                              Organisé par {orgName}
                              {e.price != null && e.price > 0 ? ` · ${e.price.toFixed(2)} €` : ' · Gratuit'}
                            </span>
                          </span>

                          <Badge variant="secondary" className="shrink-0">
                            {e.currentParticipants}
                            {e.maxParticipants != null ? `/${e.maxParticipants}` : ''} 👥
                          </Badge>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
