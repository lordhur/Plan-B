import { format, formatDistanceToNow, isSameDay, isTomorrow, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'

/** « samedi 14 juin à 09:00 » — avec jours relatifs pour aujourd'hui/demain. */
export function formatEventDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isToday(d)) return `Aujourd'hui à ${format(d, 'HH:mm', { locale: fr })}`
  if (isTomorrow(d)) return `Demain à ${format(d, 'HH:mm', { locale: fr })}`
  return format(d, "EEEE d MMMM 'à' HH:mm", { locale: fr })
}

/** « sam. 14 juin » — version courte pour les cartes. */
export function formatEventDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isToday(d)) return "Aujourd'hui"
  if (isTomorrow(d)) return 'Demain'
  return format(d, 'EEE d MMM', { locale: fr })
}

/** Durée entre deux dates (« 2 h 30 »). */
export function formatDuration(start: Date | string, end: Date | string | null | undefined): string | null {
  if (!end) return null
  const s = typeof start === 'string' ? new Date(start) : start
  const e = typeof end === 'string' ? new Date(end) : end
  const minutes = Math.round((e.getTime() - s.getTime()) / 60000)
  if (minutes <= 0) return null
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${String(m).padStart(2, '0')}`
}

/** « il y a 3 heures » / « dans 2 jours ». */
export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: fr })
}

/** Date complète « 14 juin 2026 ». */
export function formatFullDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(d, 'd MMMM yyyy', { locale: fr })
}

/** Convertit un datetime-local input (« 2026-06-14T09:00 ») en Date locale. */
export function fromLocalInput(value: string): Date {
  return new Date(value)
}

/** Convertit une Date en valeur pour un input datetime-local. */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export { isSameDay, isToday, isTomorrow }
