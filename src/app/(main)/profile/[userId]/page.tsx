'use client'

import { Award, ArrowLeft, MapPin, MessageCircle, Star } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { ageFromBirthDate } from '@/lib/utils'
import { formatRelative } from '@/lib/date'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CategoryIcon } from '@/components/common/CategoryIcon'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { FriendButton } from '@/components/friends/FriendButton'

/** PROFIL PUBLIC d'un autre utilisateur. */
export default function PublicProfilePage() {
  const params = useParams<{ userId: string }>()
  const { data: profile, isLoading, error } = trpc.users.byId.useQuery(
    { id: params.userId },
    { enabled: !!params.userId },
  )
  const { data: ratings } = trpc.users.ratings.useQuery(
    { userId: params.userId },
    { enabled: !!params.userId },
  )

  if (isLoading) return <LoadingSpinner className="py-20" />
  if (error || !profile) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-xl font-bold">Profil introuvable</h1>
        <Button asChild className="mt-4" variant="secondary">
          <Link href="/">Retour à l’accueil</Link>
        </Button>
      </div>
    )
  }

  const displayName = profile.displayName || `${profile.firstName} ${profile.lastName}`

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Retour
      </Link>

      <Card>
        <CardContent className="flex flex-col items-center pt-8 text-center">
          <Avatar src={profile.avatarUrl} name={displayName} size="xl" />
          <h1 className="mt-4 text-2xl font-extrabold">
            {profile.showLastName ? displayName : `${profile.firstName} ${profile.lastName.charAt(0)}.`}
            {profile.showAge ? `, ${ageFromBirthDate(new Date(profile.dateOfBirth))} ans` : ''}
          </h1>
          {profile.city && (
            <p className="mt-1 flex items-center gap-1 text-sm text-fg-muted">
              <MapPin className="h-4 w-4" aria-hidden /> {profile.city}
            </p>
          )}
          {profile.profession && (
            <p className="mt-1 text-sm font-semibold">💼 {profile.profession}</p>
          )}
          {profile.education && (
            <p className="text-sm text-fg-muted">🎓 {profile.education}</p>
          )}
          <p className="mt-2 flex items-center gap-2 text-sm">
            <span className="font-semibold text-warning-600">
              <Star className="mr-0.5 inline h-3.5 w-3.5 fill-current" aria-hidden />
              {profile.averageRating.toFixed(1)}
            </span>
            <span className="text-fg-muted">({profile.totalRatings} avis)</span>
            {profile.trustScore >= 80 && <Badge variant="secondary">Membre de confiance</Badge>}
          </p>

          {profile.badges.length > 0 && (
            <ul className="mt-4 flex flex-wrap justify-center gap-1.5" aria-label="Badges">
              {profile.badges.map((b) => (
                <li
                  key={b.badge.code}
                  title={b.badge.description}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ backgroundColor: `${b.badge.color}22`, color: b.badge.color }}
                >
                  <Award className="h-3.5 w-3.5" aria-hidden /> {b.badge.name}
                </li>
              ))}
            </ul>
          )}

          <dl className="mt-5 grid w-full grid-cols-3 gap-2">
            {(
              [
                [profile.eventsCreated, 'Plans créés'],
                [profile.eventsAttended, 'Plans rejoints'],
                [profile.friendCount, 'Amis'],
              ] as const
            ).map(([value, label]) => (
              <div key={label} className="rounded-xl bg-bg-secondary p-3">
                <dt className="sr-only">{label}</dt>
                <dd className="text-xl font-extrabold text-primary-600">{value}</dd>
                <dd className="text-[11px] font-medium text-fg-muted">{label}</dd>
              </div>
            ))}
          </dl>

          {profile.bio && <p className="mt-4 max-w-md text-sm text-fg-muted">{profile.bio}</p>}

          {/* Galerie de photos */}
          {profile.profilePhotos.length > 0 && (
            <div className="mt-4 grid w-full grid-cols-3 gap-1.5 sm:grid-cols-4">
              {profile.profilePhotos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={p.url}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full rounded-xl object-cover"
                />
              ))}
            </div>
          )}

          {/* Vidéo de présentation */}
          {profile.videoUrl && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              src={profile.videoUrl}
              controls
              className="mt-4 max-h-72 w-full rounded-xl bg-black"
            />
          )}

          {/* Catégories favorites */}
          {profile.favoriteCategories.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {profile.favoriteCategories.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
                  style={{ backgroundColor: `${c.color}22`, color: c.color }}
                >
                  <CategoryIcon name={c.icon} className="h-3.5 w-3.5" aria-hidden />
                  {c.name}
                </span>
              ))}
            </div>
          )}

          {profile.interests.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {profile.interests.map((i) => (
                <Badge key={i.id} variant="secondary">
                  {i.name}
                </Badge>
              ))}
            </div>
          )}

          {!profile.isMe && (
            <div className="mt-5 flex w-full items-center gap-2">
              <FriendButton userId={profile.id} variant="default" className="flex-1" />
              <MessageUserButton userId={profile.id} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Avis reçus */}
      {ratings && ratings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Avis reçus</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {ratings.map((r) => (
                <li key={r.id} className="flex gap-3">
                  <Avatar
                    src={r.from.avatarUrl}
                    name={`${r.from.firstName} ${r.from.lastName}`}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {r.from.firstName} {r.from.lastName.charAt(0)}.{' '}
                      <span className="font-normal text-fg-muted">· {formatRelative(r.createdAt)}</span>
                    </p>
                    <p aria-label={`Note : ${r.rating} sur 5`} className="text-warning-500">
                      {'★'.repeat(r.rating)}
                      <span className="text-border">{'★'.repeat(5 - r.rating)}</span>
                    </p>
                    {r.comment && <p className="mt-1 text-sm text-fg-muted">« {r.comment} »</p>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


/** Ouvre (ou crée) la conversation privée avec cet utilisateur. */
function MessageUserButton({ userId }: { userId: string }) {
  const router = useRouter()
  const startWith = trpc.messages.startWith.useMutation({
    onSuccess: (res) => router.push(`/messages/${res.conversationId}`),
  })
  return (
    <Button
      variant="secondary"
      className="flex-1"
      disabled={startWith.isPending}
      onClick={() => startWith.mutate({ userId })}
    >
      <MessageCircle className="h-4 w-4" aria-hidden /> Message
    </Button>
  )
}
