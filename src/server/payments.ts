import { randomUUID } from 'node:crypto'

/**
 * Couche paiement (spec Phase 4 §4.1).
 *
 * Abstraction volontaire : l'application parle à `PaymentProvider`, jamais
 * directement à un PSP. Deux implémentations :
 *
 *  1. `MockPaymentProvider` (actif par défaut, zéro budget / hors-ligne) :
 *     simule charge + refund avec des identifiants `mock_*`. Tous les flux
 *     métier (billets, abonnements, remboursements) sont réels en base.
 *
 *  2. `StripePaymentProvider` (production) : instancier avec
 *     STRIPE_SECRET_KEY et brancher les PaymentIntent/Checkout Sessions.
 *     Les champs `stripeCustomerId` / `stripeSubscriptionId` du schéma
 *     sont déjà prêts. Aucun autre fichier n'est à modifier.
 */

export interface ChargeInput {
  amountCents: number
  currency: string
  description: string
  customerId?: string
}

export interface ChargeResult {
  paymentId: string
  amountCents: number
  status: 'SUCCEEDED' | 'FAILED'
}

export interface PaymentProvider {
  readonly name: string
  charge(input: ChargeInput): Promise<ChargeResult>
  refund(paymentId: string, amountCents?: number): Promise<{ refundId: string }>
}

/** Paiement simulé — pour le développement et la démonstration. */
class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock'

  async charge(input: ChargeInput): Promise<ChargeResult> {
    // Latence simulée légère (réalisme des états de chargement côté client)
    await new Promise((r) => setTimeout(r, 120))
    return {
      paymentId: `mock_pay_${randomUUID().slice(0, 12)}`,
      amountCents: input.amountCents,
      status: 'SUCCEEDED',
    }
  }

  async refund(paymentId: string): Promise<{ refundId: string }> {
    return { refundId: `mock_ref_${randomUUID().slice(0, 12)} (${paymentId})` }
  }
}

/**
 * Paiement Stripe — à activer quand une clé est configurée.
 * Implémentation de référence : créer un PaymentIntent côté serveur,
 * le confirmer côté client via @stripejs, puis valider le webhook.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe'
  constructor(private readonly secretKey: string) {}

  async charge(input: ChargeInput): Promise<ChargeResult> {
    // Intégration réelle (nécessite `npm i stripe` + webhook) :
    //   const stripe = new Stripe(this.secretKey)
    //   const intent = await stripe.paymentIntents.create({...})
    throw new Error(
      `Stripe non câblé dans cet environnement (clé présente : ${this.secretKey ? 'oui' : 'non'}). ` +
        'Utilisez le mode démo ou complétez StripePaymentProvider.',
    )
  }

  async refund(): Promise<{ refundId: string }> {
    throw new Error('Stripe non câblé — complétez StripePaymentProvider.')
  }
}

/** Provider actif : Stripe si clé fournie ET activé explicitement, sinon mock. */
export const payments: PaymentProvider = (() => {
  const key = process.env.STRIPE_SECRET_KEY
  if (key && process.env.PAYMENTS_PROVIDER === 'stripe') return new StripePaymentProvider(key)
  return new MockPaymentProvider()
})()

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100)
}

export function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}
