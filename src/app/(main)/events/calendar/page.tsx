'use client'

import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { cn } from '@/lib/utils'

/** Calendrier des plans à venir (mois navigable). */
export default function CalendarPage() {
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState<Date | null>(() => new Date())

  const range = useMemo(() => {
    const from = startOfMonth(month)
    const to = endOfMonth(month)
    return { from, to }
  }, [month])

  const events = trpc.events.inRange.useQuery({ from: range.from, to: range.to })

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

  const selectedEvents = selected ? byDay.get(format(selected, 'yyyy-MM-dd')) ?? [] : []
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

      <section aria-labelledby="day-events-title">
        <h2 id="day-events-title" className="mb-3 font-semibold capitalize">
          {selected ? format(selected, 'EEEE d MMMM', { locale: fr }) : 'Sélectionnez un jour'}
        </h2>
        {selectedEvents.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Aucun plan ce jour-là" description="Changez de date ou créez votre propre plan !" />
        ) : (
          <ul className="space-y-3">
            {selectedEvents.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/events/${e.slug}`}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-card-hover"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: `${e.category.color}22` }} aria-hidden>
                    {e.category.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{e.title}</span>
                    <span className="block text-xs text-fg-muted">
                      {format(e.startDate, 'HH:mm')} · {e.city}
                      {e.price != null && e.price > 0 ? ` · ${e.price.toFixed(2)} €` : ' · Gratuit'}
                    </span>
                  </span>
                  <Badge variant="secondary">
                    {e.currentParticipants}
                    {e.maxParticipants != null ? `/${e.maxParticipants}` : ''} 👥
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
