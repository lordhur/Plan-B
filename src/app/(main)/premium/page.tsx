'use client'

import { Check, Crown, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from '@/components/ui/toast'
import { PLANS } from '@/lib/constants'
import { formatFullDate } from '@/lib/date'

/** Abonnements premium (spec Phase 4 §4.2) — paiement simulé en démo. */
export default function PremiumPage() {
  const { isAuthenticated, isLoading: loadingMe } = useCurrentUser()
  const sub = trpc.billing.mySubscription.useQuery(undefined, { enabled: isAuthenticated })
  const utils = trpc.useUtils()

  const subscribe = trpc.billing.subscribe.useMutation({
    onSuccess: (res) => {
      toast.success('Abonnement activé 🎉')
      void utils.billing.mySubscription.invalidate()
      void utils.auth.me.invalidate()
    },
    onError: (e) => toast.error(e.message),
  })
  const cancel = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.info('Abonnement annulé en fin de période')
      void utils.billing.mySubscription.invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  if (loadingMe || sub.isLoading) return <LoadingSpinner className="py-20" />

  const current = sub.data?.plan ?? 'FREE'

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 md:px-0">
      <header className="text-center">
        <h1 className="flex items-center justify-center gap-2 text-3xl font-extrabold tracking-tight">
          <Crown className="h-7 w-7 text-amber-500" aria-hidden /> PlanB Premium
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
          Soutenez le développement de PlanB et débloquez des avantages.
          <Badge variant="secondary" className="ml-1.5">Paiement simulé — mode démo</Badge>
        </p>
      </header>

      {sub.data?.sub && (
        <div className="rounded-2xl border border-primary-300 bg-primary-50 p-4 text-sm dark:border-primary-800 dark:bg-primary-950">
          <p className="font-semibold text-primary-700 dark:text-primary-300">
            ✨ Abonnement {PLANS.find((p) => p.id === sub.data!.sub!.plan)?.name} actif
          </p>
          <p className="mt-1 text-fg-muted">
            Prochain renouvellement : {formatFullDate(sub.data.sub.currentPeriodEnd)}
            {sub.data.sub.cancelAtPeriodEnd && ' — annulation programmée'}
          </p>
          {!sub.data.sub.cancelAtPeriodEnd && (
            <Button variant="ghost" size="sm" className="mt-2" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              Annuler l’abonnement
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = current === plan.id
          return (
            <Card key={plan.id} className={isCurrent ? 'border-primary-500 shadow-glow' : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-4 w-4 text-primary-600" aria-hidden />
                  {plan.name}
                </CardTitle>
                <p className="text-xs text-fg-muted">{plan.tagline}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-3xl font-extrabold">
                  {plan.price.toFixed(2).replace('.', ',')} €
                  <span className="text-sm font-medium text-fg-muted"> / mois</span>
                </p>
                <ul className="space-y-2 text-sm">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                      {perk}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Badge className="w-full justify-center">Plan actuel</Badge>
                ) : (
                  <Button
                    className="w-full"
                    disabled={subscribe.isPending || !isAuthenticated}
                    onClick={() => subscribe.mutate({ plan: plan.id })}
                  >
                    {subscribe.isPending ? 'Paiement…' : `Choisir ${plan.name}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {!isAuthenticated && (
        <p className="text-center text-sm text-fg-muted">
          <Link href="/login" className="font-semibold text-primary-600 hover:underline">
            Connectez-vous
          </Link>{' '}
          pour vous abonner.
        </p>
      )}

      <p className="text-center text-xs text-fg-muted">
        En production, les paiements passent par Stripe (voir <code>src/server/payments.ts</code>).
        Aucun moyen de paiement n’est stocké côté PlanB.
      </p>
    </div>
  )
}
