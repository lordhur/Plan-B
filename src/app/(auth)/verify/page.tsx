'use client'

import { Loader2, MailCheck, RefreshCw } from 'lucide-react'
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
  const [email, setEmail] = useState(emailParam)
  const [code, setCode] = useState(codeParam)
  const utils = trpc.useUtils()

  useEffect(() => {
    if (!emailParam && me?.email) setEmail(me.email)
  }, [emailParam, me])

  const verify = trpc.auth.verifyEmail.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate()
      toast.success('Email vérifié ! Bienvenue sur PlanB 🎉')
      router.push('/')
      router.refresh()
    },
    onError: (err) => toast.error('Code invalide', err.message),
  })

  const resend = trpc.auth.resendCode.useMutation({
    onSuccess: (res) => {
      if (res.devCode) {
        setCode(res.devCode)
        toast.info('Nouveau code envoyé', `Code de démo : ${res.devCode}`)
      } else {
        toast.success('Code renvoyé par email')
      }
    },
    onError: (err) => toast.error(err.message),
  })

  // Déjà vérifié → accueil
  useEffect(() => {
    if (me?.emailVerified) router.replace('/')
  }, [me, router])

  if (meLoading) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailCheck className="h-5 w-5 text-primary-600" aria-hidden /> Vérifiez votre email
        </CardTitle>
        <CardDescription>
          Saisissez le code à 6 chiffres envoyé à{' '}
          <strong>{email || 'votre adresse'}</strong>. Il expire après 15 minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          {verify.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MailCheck className="h-4 w-4" aria-hidden />}
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

        {process.env.NODE_ENV === 'development' && (
          <p className="rounded-lg bg-bg-secondary p-3 text-center text-xs text-fg-muted">
            🧪 Mode démo : sans service email configuré, le code est affiché dans le terminal serveur
            (et pré-rempli ici si vous arrivez depuis l’inscription).
          </p>
        )}

        <p className="text-center text-sm text-fg-muted">
          <Link href="/login" className="font-semibold text-primary-600 hover:underline">
            ← Retour à la connexion
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
