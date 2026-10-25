'use client'

import { CreditCard, Ticket, Undo2 } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'

interface TicketBannerProps {
  eventId: string
  eventSlug: string
  title: string
  price: number
  currency: string
  myStatus: string | null
  paymentId: string | null
  isOrganizer: boolean
}

/**
 * Billetterie des plans payants (spec Phase 4 §4.1).
 * Paiement simulé en démo (abstraction payments — swap Stripe en prod).
 */
export function TicketBanner({
  eventId,
  eventSlug,
  title,
  price,
  currency,
  myStatus,
  paymentId,
  isOrganizer,
}: TicketBannerProps) {
  const utils = trpc.useUtils()

  const buy = trpc.billing.buyTicket.useMutation({
    onSuccess: () => {
      toast.success('Billet acheté 🎟️')
      void utils.events.bySlug.invalidate({ slug: eventSlug })
    },
    onError: (e) => toast.error(e.message),
  })
  const refund = trpc.billing.refundTicket.useMutation({
    onSuccess: () => {
      toast.success('Billet remboursé, vous avez quitté le plan')
      void utils.events.bySlug.invalidate({ slug: eventSlug })
    },
    onError: (e) => toast.error(e.message),
  })

  if (isOrganizer || price <= 0) return null
  if (myStatus !== 'CONFIRMED' && myStatus !== 'PENDING') return null

  const amount = `${price.toFixed(2).replace('.', ',')} ${currency}`

  if (!paymentId) {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950"
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
          <Ticket className="h-4 w-4" aria-hidden />
          Plan payant — achetez votre billet ({amount}) pour confirmer votre place sur « {title} »
        </p>
        <Button size="sm" disabled={buy.isPending} onClick={() => buy.mutate({ eventId })}>
          <CreditCard className="h-4 w-4" aria-hidden />
          {buy.isPending ? 'Paiement…' : `Payer ${amount}`}
        </Button>
      </div>
    )
  }

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
        <Ticket className="h-4 w-4" aria-hidden />
        Billet confirmé ({amount}) — présentez-vous simplement à l’événement !
      </p>
      <Button
        size="sm"
        variant="ghost"
        className="text-danger-600"
        disabled={refund.isPending}
        onClick={() => refund.mutate({ eventId })}
      >
        <Undo2 className="h-4 w-4" aria-hidden /> Rembourser et quitter
      </Button>
    </div>
  )
}
