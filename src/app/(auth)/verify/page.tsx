'use client'

import { Check, Copy, Loader2, MailCheck, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** VÉRIFICATION EMAIL — saisie du code à 6 chiffres. */
function VerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email') ?? ''
  const codeParam = searchParams.get('code') ?? ''

  const { data: me, isLoading: meLoading } = trpc.auth.me.useQuery(undefined, { retry: false })
  const { data: delivery } = trpc.auth.deliveryStatus.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60_000,
  })
  const [email, setEmail] = useState(emailParam)
  const [code, setCode] = useState(codeParam)
  // Code affiché à l'écran : uniquement si l'e-mail n'a pas pu partir.
  const [shownCode, setShownCode] = useState(codeParam || null)
  const [copied, setCopied] = useState(false)
  const utils = trpc.useUtils()

  useEffect(() => {
    if (!emailParam && me?.email) setEmail(me.email)
  }, [emailParam, me])

  const verify = trpc.auth.verifyEmail.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate()
      toast.success('Email vérifié ! Bienvenue sur Plan B 🎉')
      router.push('/')
      router.refresh()
    },
    onError: (err) => toast.error('Code invalide', err.message),
  })

  const resend = trpc.auth.resendCode.useMutation({
    onSuccess: (res) => {
      if (res.fallbackCode) {
        // Aucun e-mail n'est parti : on montre le code, sinon la vérification
        // serait impossible.
        setShownCode(res.fallbackCode)
        setCode(res.fallbackCode)
        toast.info('Nouveau code généré', 'Il est affiché ci-dessous (e-mail non configuré).')
      } else {
        setShownCode(null)
        toast.success('Code renvoyé par email', `Consultez la boîte ${email}.`)
      }
    },
    onError: (err) => toast.error(err.message),
  })

  // Déjà vérifié → accueil
  useEffect(() => {
    if (me?.emailVerified) router.replace('/')
  }, [me, router])

  const copyCode = async () => {
    if (!shownCode) return
    try {
      await navigator.clipboard.writeText(shownCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.info('Copie impossible', `Code : ${shownCode}`)
    }
  }

  if (meLoading) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailCheck className="h-5 w-5 text-primary-600" aria-hidden /> Vérifiez votre email
        </CardTitle>
        <CardDescription>
          Saisissez le code à 6 chiffres envoyé à <strong>{email || 'votre adresse'}</strong>. Il
          expire après 15 minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aucun service e-mail configuré : on le dit clairement et on affiche le code. */}
        {delivery && !delivery.email && (
          <div
            role="status"
            className="rounded-xl border border-warning-500/40 bg-warning-50 px-3.5 py-3 text-sm dark:bg-warning-500/10"
          >
            <p className="font-semibold text-warning-700 dark:text-warning-400">
              Le service d’envoi d’e-mails n’est pas encore activé sur Plan B.
            </p>
            <p className="mt-1 text-xs text-fg-muted">
              Votre code s’affiche directement ici (et dans les journaux du serveur). Pour recevoir
              les prochains codes par e-mail, ajoutez une clé <code>RESEND_API_KEY</code> dans les
              variables d’environnement Vercel — c’est gratuit jusqu’à 100 e-mails par jour.
            </p>
          </div>
        )}

        {shownCode && (
          <div
            role="status"
            className="rounded-xl border border-primary-500/40 bg-primary-50 px-3.5 py-3 text-center dark:bg-primary-950"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">
              Votre code de vérification
            </p>
            <p className="mt-1 text-3xl font-black tracking-[0.35em] text-fg">{shownCode}</p>
            <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={copyCode}>
              {copied ? (
                <>
                  <Check className="h-4 w-4" aria-hidden /> Copié
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden /> Copier le code
                </>
              )}
            </Button>
          </div>
        )}

        <div>
          <Label htmlFor="verify-email">Email</Label>
          <Input
            id="verify-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div>
          <Label htmlFor="verify-code">Code à 6 chiffres</Label>
          <Input
            id="verify-code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="text-center text-2xl font-bold tracking-[0.5em]"
            autoComplete="one-time-code"
          />
        </div>

        <Button
          className="w-full"
          disabled={verify.isPending || code.length !== 6 || !email}
          onClick={() => verify.mutate({ target: email, code })}
        >
          {verify.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <MailCheck className="h-4 w-4" aria-hidden />
          )}
          Vérifier mon email
        </Button>

        <Button
          variant="ghost"
          className="w-full"
          disabled={resend.isPending || !email}
          onClick={() => resend.mutate({ email })}
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> Renvoyer un code
        </Button>

        <p className="text-center text-sm text-fg-muted">
          <Link href="/login" className="font-semibold text-primary-600 hover:underline">
            ← Retour à la connexion
          </Link>
          {' · '}
          <Link href="/" className="font-semibold text-primary-600 hover:underline">
            Continuer sans vérifier
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  )
}
