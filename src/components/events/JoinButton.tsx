'use client'

import { Check, Clock, Hand, Loader2, Share2, UserMinus, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface JoinButtonProps {
  eventId: string
  eventSlug: string
  registrationType: 'OPEN' | 'APPROVAL_REQUIRED' | 'INVITATION_ONLY'
  isFull: boolean
  myStatus?: string | null
  isOrganizer?: boolean
  waitlistPosition?: number | null
  className?: string
}

/**
 * Bouton « Rejoindre » intelligent :
 * - non connecté → redirection inscription (avec retour sur l'événement)
 * - non vérifié → redirection vérification
 * - complet → liste d'attente
 * - sur validation → demande
 * - déjà inscrit → se désister
 */
export function JoinButton({
  eventId,
  eventSlug,
  registrationType,
  isFull,
  myStatus,
  isOrganizer,
  waitlistPosition,
  className,
}: JoinButtonProps) {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useCurrentUser()
  const utils = trpc.useUtils()
  const [pending, setPending] = useState(false)

  const invalidate = () => {
    void utils.events.bySlug.invalidate({ slug: eventSlug })
    void utils.events.feed.invalidate()
    void utils.events.search.invalidate()
    void utils.notifications.unreadCount.invalidate()
  }

  const join = trpc.events.join.useMutation({
    onSuccess: (res) => {
      if (res.result === 'JOINED') toast.success('Vous participez à ce plan ! 🎉')
      if (res.result === 'PENDING') toast.info('Demande envoyée ✋', "L'organisateur doit valider votre participation")
      if (res.result === 'WAITLISTED')
        toast.info(`Liste d'attente — position ${res.position}`, 'Vous serez notifié si une place se libère')
      invalidate()
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const leave = trpc.events.leave.useMutation({
    onSuccess: () => {
      toast.success('Désinscription effectuée')
      invalidate()
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const busy = pending || join.isPending || leave.isPending

  // Organisateur → pas de bouton rejoindre
  if (isOrganizer) {
    return (
      <Button variant="secondary" disabled className={className}>
        <Check className="h-4 w-4" aria-hidden /> Vous organisez
      </Button>
    )
  }

  // Déjà inscrit
  if (myStatus === 'CONFIRMED' || myStatus === 'ATTENDED') {
    return (
      <Button
        variant="secondary"
        className={cn('text-success-600', className)}
        disabled={busy}
        onClick={async () => {
          setPending(true)
          leave.mutate({ eventId })
          setPending(false)
        }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserMinus className="h-4 w-4" aria-hidden />}
        Je participe ✓ — Se désister
      </Button>
    )
  }

  if (myStatus === 'PENDING') {
    return (
      <Button variant="secondary" disabled className={className}>
        <Clock className="h-4 w-4" aria-hidden /> En attente de validation
      </Button>
    )
  }

  // En liste d'attente
  if (waitlistPosition != null) {
    return (
      <Button
        variant="secondary"
        className={className}
        disabled={busy}
        onClick={async () => {
          setPending(true)
          leave.mutate({ eventId })
          setPending(false)
        }}
      >
        <Users className="h-4 w-4" aria-hidden /> Liste d’attente n°{waitlistPosition} — Quitter
      </Button>
    )
  }

  const handleClick = () => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.push(`/register?next=/events/${eventSlug}`)
      return
    }
    if (!user?.emailVerified) {
      toast.error('Vérifiez votre email pour rejoindre un plan')
      router.push('/verify')
      return
    }
    join.mutate({ eventId })
  }

  // Complet → liste d'attente
  if (isFull && registrationType !== 'INVITATION_ONLY') {
    return (
      <Button variant="accent" className={className} onClick={handleClick} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Users className="h-4 w-4" aria-hidden />}
        Rejoindre la liste d’attente
      </Button>
    )
  }

  // Sur validation → demande
  if (registrationType === 'APPROVAL_REQUIRED') {
    return (
      <Button variant="outline" className={className} onClick={handleClick} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Hand className="h-4 w-4" aria-hidden />}
        Demander à participer
      </Button>
    )
  }

  if (registrationType === 'INVITATION_ONLY') {
    return (
      <Button variant="secondary" className={className} onClick={handleClick} disabled={busy}>
        <Share2 className="h-4 w-4" aria-hidden /> Tenter avec mon invitation
      </Button>
    )
  }

  return (
    <Button className={className} onClick={handleClick} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
      Rejoindre
    </Button>
  )
}
