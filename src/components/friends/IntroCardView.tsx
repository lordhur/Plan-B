'use client'

import { MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FriendButton } from './FriendButton'

export interface IntroCardItem {
  id: string
  title: string
  about: string
  lookingFor: string | null
  photoUrl: string | null
  photos: string[]
  passions: string[]
  profession: string | null
  education: string | null
  createdAt: Date
  user: {
    id: string
    firstName: string
    lastName: string
    displayName: string | null
    avatarUrl: string | null
    city: string | null
    age: number | null
    gender: string | null
    averageRating: number
    totalRatings: number
  }
}

/** Fiche de présentation d'un membre — galerie photos, passions, métier. */
export function IntroCardView({
  card,
  onMessage,
}: {
  card: IntroCardItem
  onMessage?: (userId: string) => void
}) {
  const name = card.user.displayName || `${card.user.firstName} ${card.user.lastName}`
  return (
    <Card className="card-sheen overflow-hidden">
      {card.photos.length > 0 ? (
        <div className="flex h-32 w-full overflow-x-auto">
          {card.photos.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p}
              src={p}
              alt={`Photo ${i + 1} de la fiche`}
              loading="lazy"
              className="h-full w-1/2 shrink-0 object-cover"
            />
          ))}
        </div>
      ) : card.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.photoUrl} alt="" loading="lazy" className="h-32 w-full object-cover" />
      ) : null}
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${card.user.id}`}>
            <Avatar src={card.user.avatarUrl} name={name} size="md" />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/profile/${card.user.id}`} className="block truncate font-bold hover:underline">
              {name}
            </Link>
            <p className="truncate text-xs text-fg-muted">
              {card.user.age != null ? `${card.user.age} ans` : ''}
              {card.user.age != null && card.user.city ? ' · ' : ''}
              {card.user.city ?? ''}
            </p>
          </div>
        </div>
        <p className="font-bold text-primary-700 dark:text-primary-300">{card.title}</p>
        {(card.profession || card.education) && (
          <p className="text-xs font-semibold text-fg-muted">
            {card.profession}
            {card.profession && card.education ? ' · ' : ''}
            {card.education ? `🎓 ${card.education}` : ''}
          </p>
        )}
        {card.passions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.passions.slice(0, 6).map((p) => (
              <span
                key={p}
                className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700 dark:bg-primary-950 dark:text-primary-300"
              >
                {p}
              </span>
            ))}
          </div>
        )}
        <p className="line-clamp-4 whitespace-pre-wrap text-sm text-fg-muted">{card.about}</p>
        {card.lookingFor && (
          <p className="rounded-lg bg-bg-secondary px-3 py-1.5 text-xs font-semibold">
            🔎 Recherche : {card.lookingFor}
          </p>
        )}
        <div className="flex items-center gap-1.5 pt-1">
          {onMessage && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onMessage(card.user.id)}
            >
              <MessageCircle className="h-4 w-4" aria-hidden /> Message
            </Button>
          )}
          <FriendButton userId={card.user.id} size="sm" />
        </div>
      </CardContent>
    </Card>
  )
}
