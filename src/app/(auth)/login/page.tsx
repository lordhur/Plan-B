'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, LogIn } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { loginSchema, type LoginInput } from '@/lib/validators'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'
import { useLang } from '@/lib/i18n'

function LoginForm() {
  const { t: tl } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/'
  const signedOut = searchParams.get('signedOut') === '1'
  const oauthUnavailable = searchParams.get('oauth') === 'unavailable'
  const utils = trpc.useUtils()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  useEffect(() => {
    if (signedOut) toast.success('Vous êtes déconnecté 👋', 'À bientôt sur Plan B')
  }, [signedOut])

  const login = trpc.auth.login.useMutation({
    onSuccess: async (res) => {
      // On recharge toutes les données : aucune chance de réutiliser un cache
      // « déconnecté » (service worker ou client tRPC).
      await utils.invalidate()
      toast.success('Content de vous revoir ! 👋')
      router.push(res.needsOnboarding ? '/verify' : next)
      router.refresh()
    },
    onError: (err) => toast.error('Connexion impossible', err.message),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tl('auth_login_title')}</CardTitle>
        <CardDescription>{tl('auth_login_sub')}</CardDescription>
      </CardHeader>
      <CardContent>
        {oauthUnavailable && (
          <p
            role="status"
            className="text-warning-700 dark:text-warning-400 mb-4 rounded-xl border border-warning-500/40 bg-warning-50 px-3 py-2 text-center text-sm font-medium dark:bg-warning-500/10"
          >
            Cette connexion sociale n’est pas encore activée. Utilisez votre email et mot de passe,
            ou créez un compte en quelques secondes.
          </p>
        )}
        {signedOut && (
          <p
            role="status"
            className="text-success-700 dark:text-success-400 mb-4 rounded-xl border border-success-500/40 bg-success-50 px-3 py-2 text-center text-sm font-semibold dark:bg-success-500/10"
          >
            ✅ Vous êtes bien déconnecté.
          </p>
        )}
        <form
          onSubmit={handleSubmit((data) => login.mutate(data))}
          className="space-y-4"
          noValidate
        >
          <div>
            <Label htmlFor="email">{tl('auth_email')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={tl('auth_email_ph')}
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p role="alert" className="mt-1 text-xs font-medium text-danger-500">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{tl('auth_password')}</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary-600 hover:underline"
              >
                {tl('auth_forgot')}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <p role="alert" className="mt-1 text-xs font-medium text-danger-500">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <LogIn className="h-4 w-4" aria-hidden />
            )}
            {tl('auth_login')}
          </Button>

          <p className="text-center text-sm text-fg-muted">
            {tl('auth_no_account')}{' '}
            <Link href="/register" className="font-semibold text-primary-600 hover:underline">
              {tl('auth_register')}
            </Link>
          </p>

          <p className="rounded-lg bg-bg-secondary p-3 text-center text-xs text-fg-muted">
            🧪 {tl('auth_demo')} : <code className="font-semibold">thomas@planb.app</code> /{' '}
            <code className="font-semibold">planb1234</code>
          </p>
        </form>

        <SocialAuthButtons label="login" />
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
