'use client'

import { CalendarHeart, Clock, Heart, Hourglass, MapPin } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { useLang } from '@/lib/i18n'

type AgendaItem = {
  id: string
  title: string
  slug: string
  startDate: Date | string
  city: string
  category: { name: string; icon: string; color: string } | null
}

/** MON AGENDA — mes inscriptions, liste d'attente, plans likés et activités passées. */
export default function AgendaPage() {
  const { t } = useLang()
  const { isAuthenticated, isLoading } = useCurrentUser()
  const agenda = trpc.agenda.me.useQuery(undefined, { enabled: isAuthenticated })

  if (isLoading) return <LoadingSpinner label="Chargement" />

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <EmptyState
          icon={CalendarHeart}
          title="Connectez-vous pour voir votre agenda"
          description="Vos inscriptions, votre liste d'attente et vos souvenirs vous attendent."
          action={
            <Button asChild>
              <Link href="/login">Me connecter</Link>
            </Button>
          }
        />
      </div>
    )
  }

  if (agenda.isLoading) return <LoadingSpinner label="Chargement de votre agenda" />
  const data = agenda.data

  const sections: {
    title: string
    icon: typeof Clock
    color: string
    rows: AgendaItem[]
    empty: string
    withMedia?: boolean
    showLikes?: boolean
  }[] = [
    {
      title: t('agenda_registered'),
      icon: CalendarHeart,
      color: 'text-primary-600',
      rows: data?.upcoming ?? [],
      empty: 'Aucune inscription à venir — rejoignez un plan !',
    },
    {
      title: t('agenda_waitlist'),
      icon: Hourglass,
      color: 'text-warning-600',
      rows: data?.waitlist ?? [],
      empty: 'Vous n’êtes sur aucune liste d’attente.',
    },
    {
      title: t('agenda_liked'),
      icon: Heart,
      color: 'text-danger-500',
      rows: data?.liked ?? [],
      empty: 'Likez des plans (❤️) pour les retrouver ici.',
    },
    {
      title: t('agenda_past'),
      icon: Clock,
      color: 'text-fg-muted',
      rows: data?.past ?? [],
      empty: 'Vos souvenirs s’afficheront ici après vos premières sorties.',
      withMedia: true,
    },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 md:px-0">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <CalendarHeart className="h-6 w-6 text-primary-600" aria-hidden />
          {t('agenda_title')}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">{t('agenda_subtitle')}</p>
      </header>

      {sections.map(({ title, icon: Icon, color, rows, empty, withMedia }) => (
        <section key={title} aria-label={title}>
          <h2 className={`mb-3 flex items-center gap-2 text-lg font-bold ${color}`}>
            <Icon className="h-5 w-5" aria-hidden />
            {title}
            <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-xs font-bold text-fg-muted">
              {rows.length}
            </span>
          </h2>
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-fg-muted">
              {empty}
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((e) => {
                const date = new Date(e.startDate)
                const item = e as AgendaItem & { mediaCount?: number; liked?: boolean }
                return (
                  <li key={e.id}>
                    <Link
                      href={withMedia ? `/events/${e.slug}/photos` : `/events/${e.slug}`}
                      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 transition-colors hover:border-primary-300"
                    >
                      <span className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-primary-50 py-1.5 dark:bg-primary-500/10">
                        <span className="text-[10px] font-black uppercase text-primary-600 dark:text-primary-300">
                          {format(date, 'MMM', { locale: fr })}
                        </span>
                        <span className="text-sm font-extrabold leading-none">
                          {format(date, 'd')}
                        </span>
                        <span className="text-[10px] font-semibold text-fg-muted">
                          {format(date, 'HH:mm')}
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
                          {item.liked && <Heart className="h-3.5 w-3.5 shrink-0 fill-danger-500 text-danger-500" aria-hidden />}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-fg-muted">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="truncate">{e.city}</span>
                        </span>
                      </span>
                      {withMedia &&
                        ((item.mediaCount ?? 0) > 0 ? (
                          <span className="shrink-0 rounded-full bg-secondary-50 px-2 py-1 text-[11px] font-bold text-secondary-600 dark:bg-secondary-500/10 dark:text-secondary-300">
                            📷 {item.mediaCount}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full border border-dashed border-border px-2 py-1 text-[11px] font-semibold text-fg-muted">
                            + photos
                          </span>
                        ))}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
