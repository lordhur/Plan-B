'use client'

import { KeyRound, Loader2, MailCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Step = 'request' | 'reset'

/** MOT DE PASSE OUBLIÉ — code par email puis nouveau mot de passe. */
export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')

  const forgot = trpc.auth.forgotPassword.useMutation({
    onSuccess: (res) => {
      setStep('reset')
      if (res.fallbackCode) {
        setCode(res.fallbackCode)
        toast.info('Code généré', `E-mail non configuré — votre code : ${res.fallbackCode}`)
      } else {
        toast.success('Si ce compte existe, un code vient d’être envoyé par email.')
      }
    },
    onError: (err) => toast.error(err.message),
  })

  const reset = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success('Mot de passe modifié', 'Connectez-vous avec votre nouveau mot de passe.')
      router.push('/login')
    },
    onError: (err) => toast.error('Réinitialisation impossible', err.message),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary-600" aria-hidden /> Mot de passe oublié
        </CardTitle>
        <CardDescription>
          {step === 'request'
            ? 'Entrez votre email, nous vous enverrons un code de réinitialisation.'
            : 'Saisissez le code reçu et choisissez un nouveau mot de passe.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="fp-email">Email</Label>
          <Input
            id="fp-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={step === 'reset'}
          />
        </div>

        {step === 'reset' && (
          <>
            <div>
              <Label htmlFor="fp-code">Code à 6 chiffres</Label>
              <Input
                id="fp-code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-xl font-bold tracking-[0.4em]"
                autoComplete="one-time-code"
              />
            </div>
            <div>
              <Label htmlFor="fp-password">Nouveau mot de passe</Label>
              <Input
                id="fp-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-fg-muted">
                8 caractères min., une lettre et un chiffre.
              </p>
            </div>
          </>
        )}

        {step === 'request' ? (
          <Button
            className="w-full"
            disabled={forgot.isPending || !email}
            onClick={() => forgot.mutate({ email })}
          >
            {forgot.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <MailCheck className="h-4 w-4" aria-hidden />
            )}
            Recevoir un code
          </Button>
        ) : (
          <Button
            className="w-full"
            disabled={reset.isPending || code.length !== 6 || password.length < 8}
            onClick={() => reset.mutate({ email, code, password })}
          >
            {reset.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden />
            )}
            Réinitialiser
          </Button>
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
