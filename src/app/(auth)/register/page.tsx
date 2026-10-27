'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { useForm } from 'react-hook-form'
import { registerSchema, type RegisterInput } from '@/lib/validators'
import { GENDER_LABELS } from '@/lib/constants'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'
import { useLang } from '@/lib/i18n'
import { Select } from '@/components/ui/select'

const MIN_BIRTHDATE = new Date()
MIN_BIRTHDATE.setFullYear(MIN_BIRTHDATE.getFullYear() - 18)

function RegisterForm() {
  const { t: tl } = useLang()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next')
  const [devCode, setDevCode] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema) as never, // z.coerce.date() : input ≠ output
  })

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: (res) => {
      setDevCode(res.devCode ?? null)
      if (res.devCode) {
        // Mode démo : code affiché, on passe direct à la vérification
        toast.success('Compte créé !', `Code de vérification : ${res.devCode}`)
      }
      router.push(`/verify?email=${encodeURIComponent(res.email)}${res.devCode ? `&code=${res.devCode}` : ''}`)
    },
    onError: (err) => toast.error('Inscription impossible', err.message),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary-600" aria-hidden /> {tl('auth_create')}
        </CardTitle>
        <CardDescription>
          {tl('auth_register_sub')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((data) => registerMutation.mutate(data))}
          className="space-y-4"
          noValidate
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">{tl('auth_firstname')} *</Label>
              <Input id="firstName" autoComplete="given-name" aria-invalid={!!errors.firstName} {...register('firstName')} />
              {errors.firstName && <p role="alert" className="mt-1 text-xs text-danger-500">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label htmlFor="lastName">{tl('auth_lastname')} *</Label>
              <Input id="lastName" autoComplete="family-name" aria-invalid={!!errors.lastName} {...register('lastName')} />
              {errors.lastName && <p role="alert" className="mt-1 text-xs text-danger-500">{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="email">{tl('auth_email')} *</Label>
            <Input id="email" type="email" autoComplete="email" placeholder={tl('auth_email_ph')} aria-invalid={!!errors.email} {...register('email')} />
            {errors.email && <p role="alert" className="mt-1 text-xs text-danger-500">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="password">{tl('auth_password')} *</Label>
            <Input id="password" type="password" autoComplete="new-password" aria-describedby="password-hint" aria-invalid={!!errors.password} {...register('password')} />
            <p id="password-hint" className="mt-1 text-xs text-fg-muted">
              {tl('auth_pwd_hint')}
            </p>
            {errors.password && <p role="alert" className="mt-1 text-xs text-danger-500">{errors.password.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="dateOfBirth">{tl('auth_birth')} *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                max={MIN_BIRTHDATE.toISOString().split('T')[0]}
                aria-invalid={!!errors.dateOfBirth}
                {...register('dateOfBirth', { valueAsDate: true })}
              />
              {errors.dateOfBirth && <p role="alert" className="mt-1 text-xs text-danger-500">{errors.dateOfBirth.message}</p>}
            </div>
            <div>
              <Label htmlFor="gender">{tl('auth_gender')}</Label>
              <Select id="gender" {...register('gender')}>
                {Object.entries(GENDER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ArrowRight className="h-4 w-4" aria-hidden />
            )}
            {tl('auth_continue')}
          </Button>

          <p className="text-center text-xs text-fg-muted">
            {tl('auth_terms')}
          </p>

          <p className="text-center text-sm text-fg-muted">
            {tl('auth_already')}{' '}
            <Link href="/login" className="font-semibold text-primary-600 hover:underline">
              {tl('auth_have_account')}
            </Link>
          </p>
        </form>

        <SocialAuthButtons label="register" />
      </CardContent>
    </Card>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  )
}
