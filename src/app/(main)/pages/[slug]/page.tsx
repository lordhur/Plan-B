'use client'

import { ArrowLeft, BadgeCheck, CalendarDays, Globe, Mail, MapPin, Phone } from 'lucide-react'
import Link from 'next/link'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { use } from 'react'
import { trpc } from '@/lib/trpc'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from '@/components/ui/toast'
import { formatEventDate } from '@/lib/date'

/** Profil public d'une page (spec Phase 5 §5.1). */
export default function PublicPagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const page = trpc.pages.bySlug.useQuery({ slug })
  const utils = trpc.useUtils()
  const follow = trpc.pages.toggleFollow.useMutation({
    onSuccess: (res) => {
      toast.success(res.following ? 'Vous suivez cette page' : 'Vous ne suivez plus cette page')
      void utils.pages.bySlug.invalidate({ slug })
    },
    onError: (e) => toast.error(e.message),
  })

  if (page.isLoading) return <LoadingSpinner className="py-20" />
  if (!page.data) {
    return <EmptyState icon={MapPin} title="Page introuvable" description="Cette page n’existe pas ou a été supprimée." />
  }
  const p = page.data

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-0">
      <Link href="/pages" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Toutes les pages
      </Link>

      <Card className="overflow-hidden">
        {/* Bannière de couverture */}
        <div className="relative aspect-[3/1] w-full overflow-hidden [contain:paint]">
          {p.coverUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={p.coverUrl}
              alt=""
              className="ken-burns h-full w-full object-cover"
            />
          ) : (
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(120% 100% at 15% 10%, #f9731666, transparent 55%), radial-gradient(100% 120% at 85% 90%, #8b5cf644, transparent 55%), linear-gradient(135deg, #f973162e, #0f172a14 60%, #8b5cf61f)',
              }}
            />
          )}
        </div>
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="-mt-16 rounded-full ring-4 ring-card">
            <Avatar src={p.avatarUrl} name={p.name} size="xl" />
          </div>
          <div>
            <h1 className="flex items-center justify-center gap-1.5 text-2xl font-extrabold tracking-tight">
              {p.name}
              {p.isVerified && <BadgeCheck className="h-5 w-5 text-primary-600" aria-label="Page vérifiée" />}
            </h1>
            <p className="text-sm text-fg-muted">
              {p.followerCount} abonné(s) · gérée par {p.owner.firstName} {p.owner.lastName}
            </p>
          </div>
          {p.description && <p className="max-w-md text-sm text-fg-muted">{p.description}</p>}

          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs text-fg-muted">
            {p.city && (
              <li className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> {p.address ? `${p.address}, ` : ''}{p.city}
              </li>
            )}
            {p.phone && (
              <li className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" aria-hidden /> {p.phone}
              </li>
            )}
            {p.email && (
              <li>
                <a className="flex items-center gap-1 hover:underline" href={`mailto:${p.email}`}>
                  <Mail className="h-3.5 w-3.5" aria-hidden /> {p.email}
                </a>
              </li>
            )}
            {p.website && (
              <li>
                <a className="flex items-center gap-1 hover:underline" href={p.website} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-3.5 w-3.5" aria-hidden /> Site web
                </a>
              </li>
            )}
          </ul>

          {!p.isOwner && (
            <Button
              variant={p.following ? 'secondary' : 'default'}
              disabled={follow.isPending}
              onClick={() => follow.mutate({ pageId: p.id })}
            >
              {p.following ? '✓ Abonné' : 'Suivre la page'}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary-600" aria-hidden /> Prochains plans
          </CardTitle>
        </CardHeader>
        <CardContent>
          {p.events.length === 0 ? (
            <p className="text-sm text-fg-muted">Aucun plan à venir pour le moment.</p>
          ) : (
            <ul className="space-y-2.5">
              {p.events.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/events/${e.slug}`}
                    className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-bg-secondary"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg"
                      style={{ backgroundColor: `${e.category.color}22` }}
                      aria-hidden
                    >
                      <CategoryIcon name={e.category.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{e.title}</span>
                      <span className="block text-xs text-fg-muted">
                        {formatEventDate(e.startDate)} · {e.city}
                        {e.price != null && e.price > 0 ? ` · ${e.price.toFixed(2)} €` : ' · Gratuit'}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
