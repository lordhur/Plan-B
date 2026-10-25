'use client'

import { ArrowLeft, Star } from 'lucide-react'
import Link from 'next/link'
import { use, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { RatingStars } from '@/components/ratings/RatingStars'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { toast } from '@/components/ui/toast'

/** Notation post-événement (spec Phase 2 §1.3) : noter les participants présents. */
export default function RateEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const utils = trpc.useUtils()
  const event = trpc.events.bySlug.useQuery({ slug })
  const pending = trpc.ratings.pending.useQuery(
    { eventId: event.data?.id ?? '' },
    { enabled: !!event.data?.id },
  )

  if (event.isLoading || pending.isLoading) return <LoadingSpinner label="Chargement" />
  if (!event.data) {
    return <EmptyState icon={Star} title="Événement introuvable" description="Ce plan n’existe pas." />
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-0">
      <header className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="Retour à l’événement">
          <Link href={`/events/${slug}`}>
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Noter les participants</h1>
          <p className="text-sm text-fg-muted">{event.data.title}</p>
        </div>
      </header>

      {pending.isError ? (
        <p role="alert" className="rounded-xl bg-danger-50 p-4 text-sm text-danger-700 dark:bg-danger-950 dark:text-danger-300">
          {pending.error.message}
        </p>
      ) : !pending.data?.canRate ? (
        <EmptyState
          icon={Star}
          title="Les notes ne sont pas encore ouvertes"
          description="Vous pourrez noter les autres participants une fois l’événement terminé."
          action={
            <Button asChild variant="outline">
              <Link href={`/events/${slug}`}>Retour à l’événement</Link>
            </Button>
          }
        />
      ) : pending.data.participants.length === 0 ? (
        <EmptyState icon={Star} title="Personne à noter" description="Aucun autre participant présent à cet événement." />
      ) : (
        <ul className="space-y-4">
          {pending.data.participants.map((p) => {
            const already = pending.data.given.find((g) => g.toId === p.id)
            return (
              <li key={p.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <Avatar src={p.avatarUrl} name={`${p.firstName} ${p.lastName}`} size="md" />
                  <Link href={`/profile/${p.id}`} className="min-w-0 flex-1 font-semibold hover:underline">
                    {p.firstName} {p.lastName}
                  </Link>
                  {already && (
                    <span className="shrink-0 text-sm text-fg-muted" aria-label={`Déjà noté ${already.rating} sur 5`}>
                      {'★'.repeat(already.rating)}
                    </span>
                  )}
                </div>
                {!already ? (
                  <RateForm
                    eventId={event.data.id}
                    toUserId={p.id}
                    onDone={() => void utils.ratings.pending.invalidate({ eventId: event.data.id })}
                  />
                ) : already.comment ? (
                  <p className="mt-2 text-sm italic text-fg-muted">« {already.comment} »</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function RateForm({
  eventId,
  toUserId,
  onDone,
}: {
  eventId: string
  toUserId: string
  onDone: () => void
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const rate = trpc.ratings.rate.useMutation({
    onSuccess: () => {
      toast.success('Merci pour votre avis !')
      onDone()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (rating === 0) {
          toast.error('Choisissez une note de 1 à 5 étoiles')
          return
        }
        rate.mutate({ eventId, toUserId, rating, comment: comment.trim() || undefined })
      }}
    >
      <RatingStars value={rating} onChange={setRating} size="lg" label={`Note pour ce participant`} />
      <label className="block">
        <span className="sr-only">Commentaire (optionnel)</span>
        <textarea
          rows={2}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Un mot sur votre expérience ? (optionnel)"
          className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        />
      </label>
      <Button type="submit" size="sm" disabled={rate.isPending}>
        {rate.isPending ? 'Envoi…' : 'Envoyer mon avis'}
      </Button>
    </form>
  )
}
