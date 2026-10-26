'use client'

import { CalendarPlus, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

/** Date → format Google Agenda (UTC basique : 20260101T120000Z). */
function toGoogleDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Échappement des champs ICS (RFC 5545). */
function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/**
 * Ajout d'un plan à l'agenda personnel :
 * - Google Agenda (lien direct, ouvre la création d'événement pré-rempli) ;
 * - fichier .ics pour Apple Plans/Calendrier, Outlook, etc.
 */
export function AddToCalendar({
  title,
  description,
  location,
  start,
  end,
}: {
  title: string
  description: string
  location: string
  start: Date
  end: Date
}) {
  const googleUrl =
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${toGoogleDate(start)}/${toGoogleDate(end)}` +
    `&details=${encodeURIComponent(description.slice(0, 800))}` +
    `&location=${encodeURIComponent(location)}`

  const downloadIcs = () => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PlanB//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:planb-${start.getTime()}@planb.app`,
      `DTSTAMP:${toGoogleDate(new Date())}`,
      `DTSTART:${toGoogleDate(start)}`,
      `DTEND:${toGoogleDate(end)}`,
      `SUMMARY:${icsEscape(title)}`,
      `DESCRIPTION:${icsEscape(description.slice(0, 800))}`,
      `LOCATION:${icsEscape(location)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ]
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'plan'}.ics`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.success('Fichier .ics téléchargé — ouvrez-le pour l’ajouter à votre agenda')
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm" className="flex-1">
        <a href={googleUrl} target="_blank" rel="noopener noreferrer">
          <CalendarPlus className="h-4 w-4" aria-hidden /> Google Agenda
        </a>
      </Button>
      <Button variant="outline" size="sm" className="flex-1" onClick={downloadIcs}>
        <Download className="h-4 w-4" aria-hidden /> Apple / Outlook (.ics)
      </Button>
    </div>
  )
}
