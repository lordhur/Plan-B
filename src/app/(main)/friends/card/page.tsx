'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Save, Sparkles, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { CoverImageField } from '@/components/events/CoverImageField'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const schema = z.object({
  title: z.string().trim().min(3, 'Titre trop court').max(80),
  about: z.string().trim().min(20, 'Décrivez-vous en 20 caractères minimum').max(2000),
  lookingFor: z.string().trim().max(200).optional().or(z.literal('')),
  photoUrl: z.string().trim().max(500).optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

/** Création / édition de la fiche de présentation (« Se faire des amis »). */
export default function IntroCardPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: sessionLoading } = useCurrentUser()
  const utils = trpc.useUtils()

  const myCard = trpc.introCards.me.useQuery(undefined, { enabled: isAuthenticated })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', about: '', lookingFor: '', photoUrl: '' },
  })

  useEffect(() => {
    if (myCard.data) {
      reset({
        title: myCard.data.title,
        about: myCard.data.about,
        lookingFor: myCard.data.lookingFor ?? '',
        photoUrl: myCard.data.photoUrl ?? '',
      })
    }
  }, [myCard.data, reset])

  const upsert = trpc.introCards.upsert.useMutation({
    onSuccess: async () => {
      await utils.introCards.invalidate()
      toast.success('Fiche enregistrée ✓')
      router.push('/friends')
    },
    onError: (e) => toast.error('Enregistrement impossible', e.message),
  })

  const remove = trpc.introCards.remove.useMutation({
    onSuccess: async () => {
      await utils.introCards.invalidate()
      toast.success('Fiche supprimée')
      router.push('/friends')
    },
    onError: (e) => toast.error('Suppression impossible', e.message),
  })

  if (sessionLoading || (isAuthenticated && myCard.isLoading)) return <LoadingSpinner className="py-20" />
  if (!isAuthenticated) {
    return (
      <div className="py-16 text-center">
        <p className="text-fg-muted">Connectez-vous pour créer votre fiche de présentation.</p>
        <Button asChild className="mt-4">
          <Link href="/login">Se connecter</Link>
        </Button>
      </div>
    )
  }

  const photoUrl = watch('photoUrl')

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-8 md:px-0">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/friends">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Les Membres
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Sparkles className="h-6 w-6 text-primary-600" aria-hidden />
          {myCard.data ? 'Modifier ma fiche' : 'Ma fiche de présentation'}
        </h1>
        <p className="text-sm text-fg-muted">
          Votre vitrine dans l’onglet « Se faire des amis ». Soyez vrai, soyez vous !
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Présentez-vous</CardTitle>
          <CardDescription>
            Titre accrocheur, quelques lignes sur vous, et ce que vous cherchez sur PlanB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={handleSubmit((values) =>
              upsert.mutate({
                title: values.title,
                about: values.about,
                lookingFor: values.lookingFor || undefined,
                photoUrl: values.photoUrl || undefined,
              }),
            )}
          >
            <CoverImageField value={photoUrl ?? ''} onChange={(url) => setValue('photoUrl', url)} />

            <div>
              <Label htmlFor="card-title">Titre de la fiche *</Label>
              <Input
                id="card-title"
                maxLength={80}
                placeholder="Ex : Rando, apéros et bonne humeur 🌞"
                {...register('title')}
                aria-invalid={!!errors.title}
              />
              {errors.title && (
                <p role="alert" className="mt-1 text-xs text-danger-500">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="card-about">À propos de moi *</Label>
              <Textarea
                id="card-about"
                rows={6}
                maxLength={2000}
                placeholder="Qui êtes-vous ? Vos passions, votre style de sorties, vos habitudes…"
                {...register('about')}
                aria-invalid={!!errors.about}
              />
              {errors.about && (
                <p role="alert" className="mt-1 text-xs text-danger-500">
                  {errors.about.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="card-looking">Ce que je recherche</Label>
              <Input
                id="card-looking"
                maxLength={200}
                placeholder="Ex : des partenaires de rando le week-end, des apéros…"
                {...register('lookingFor')}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? 'Enregistrement…' : (
                  <>
                    <Save className="h-4 w-4" aria-hidden /> Enregistrer ma fiche
                  </>
                )}
              </Button>
              {myCard.data && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-danger-500 hover:text-danger-600"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm('Supprimer définitivement votre fiche de présentation ?')) {
                      remove.mutate()
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden /> Supprimer
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
