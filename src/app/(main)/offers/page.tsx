'use client'

import { CheckCircle2, Gift, Store, Tag } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from '@/components/ui/toast'
import { formatFullDate } from '@/lib/date'

const PARTNER_TYPE_LABELS: Record<string, string> = {
  LOCAL_BUSINESS: 'Commerce local',
  BRAND: 'Marque',
  ORGANIZATION: 'Association',
  VENUE: 'Lieu / salle',
}

/** Bons plans partenaires (spec Phase 4 §4.3). */
export default function OffersPage() {
  const { isAuthenticated } = useCurrentUser()
  const offers = trpc.offers.active.useQuery()
  const utils = trpc.useUtils()
  const redeem = trpc.offers.redeem.useMutation({
    onSuccess: (res) => {
      toast.success(`Offre activée chez ${res.partner} !`)
      void utils.offers.active.invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-0">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Gift className="h-6 w-6 text-primary-600" aria-hidden /> Bons plans partenaires
        </h1>
        <p className="text-sm text-fg-muted">
          Des réductions chez nos partenaires locaux, réservées aux membres PlanB.
        </p>
      </header>

      {offers.isLoading ? (
        <LoadingSpinner label="Chargement des offres" />
      ) : !offers.data || offers.data.length === 0 ? (
        <EmptyState icon={Store} title="Aucune offre en cours" description="Revenez bientôt, nos partenaires préparent des surprises !" />
      ) : (
        <ul className="space-y-4">
          {offers.data.map((offer) => (
            <li key={offer.id}>
              <Card>
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
                        {offer.partner.name} · {PARTNER_TYPE_LABELS[offer.partner.type] ?? offer.partner.type}
                      </p>
                      <h2 className="text-lg font-bold">{offer.title}</h2>
                    </div>
                    {offer.discountPercent != null && (
                      <Badge className="bg-danger-500 text-base">−{offer.discountPercent}%</Badge>
                    )}
                  </div>
                  <p className="text-sm text-fg-muted">{offer.description}</p>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-fg-muted">
                      <Tag className="mr-1 inline h-3 w-3" aria-hidden />
                      Valable jusqu’au {formatFullDate(offer.validUntil)}
                      {offer.maxRedemptions != null &&
                        ` · ${offer.maxRedemptions - offer.currentRedemptions} restant(s)`}
                    </p>
                    {offer.redeemed ? (
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        Offre activée{offer.discountCode ? ` — code ${offer.discountCode}` : ''}
                      </span>
                    ) : offer.soldOut ? (
                      <Badge variant="secondary">Épuisée</Badge>
                    ) : (
                      <Button
                        size="sm"
                        disabled={redeem.isPending || !isAuthenticated}
                        onClick={() => redeem.mutate({ offerId: offer.id })}
                      >
                        {isAuthenticated ? 'J’en profite' : 'Connectez-vous'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
