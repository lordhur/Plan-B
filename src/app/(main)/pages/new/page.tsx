'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Store } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from '@/components/ui/toast'

const schema = z.object({
  name: z.string().trim().min(3, 'Nom trop court').max(80),
  category: z.enum(['commerce', 'association', 'salle', 'restaurant', 'sport', 'culture', 'autre']),
  description: z.string().trim().max(2000).optional(),
  city: z.string().trim().max(80).optional(),
  address: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(20).optional(),
  website: z.string().url('URL invalide').optional().or(z.literal('')),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

/** Création d'une page organisateur/commerce (compte vérifié requis). */
export default function NewPagePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: loadingMe } = useCurrentUser()
  const create = trpc.pages.create.useMutation({
    onSuccess: (page) => {
      toast.success('Page créée !')
      router.push(`/pages/${page.slug}`)
    },
    onError: (e) => toast.error(e.message),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'commerce' },
  })

  if (loadingMe) return <LoadingSpinner className="py-20" />
  if (!isAuthenticated) {
    return (
      <div className="py-16 text-center">
        <p className="text-fg-muted">Connectez-vous pour créer une page.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-8 md:px-0">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
        <Store className="h-6 w-6 text-primary-600" aria-hidden /> Créer une page
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Votre commerce, association ou lieu</CardTitle>
          <CardDescription>
            Publiez vos plans au nom de votre page et rassemblez une communauté d’abonnés.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={handleSubmit((values) =>
              create.mutate({
                ...values,
                website: values.website || undefined,
                email: values.email || undefined,
              }),
            )}
          >
            <div>
              <Label htmlFor="page-name">Nom *</Label>
              <Input id="page-name" {...register('name')} placeholder="Ex. : Café des Arcades" />
              {errors.name && <p role="alert" className="mt-1 text-xs text-danger-500">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="page-category">Catégorie *</Label>
              <Select id="page-category" {...register('category')}>
                <option value="commerce">Commerce</option>
                <option value="association">Association</option>
                <option value="salle">Salle / lieu</option>
                <option value="restaurant">Restaurant</option>
                <option value="sport">Sport</option>
                <option value="culture">Culture</option>
                <option value="autre">Autre</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="page-description">Description</Label>
              <Textarea id="page-description" rows={3} {...register('description')} placeholder="Présentez votre activité en quelques lignes…" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="page-city">Ville</Label>
                <Input id="page-city" {...register('city')} placeholder="Draguignan" />
              </div>
              <div>
                <Label htmlFor="page-address">Adresse</Label>
                <Input id="page-address" {...register('address')} placeholder="12 place des Arcades" />
              </div>
              <div>
                <Label htmlFor="page-phone">Téléphone</Label>
                <Input id="page-phone" {...register('phone')} placeholder="04 94 00 00 00" />
              </div>
              <div>
                <Label htmlFor="page-email">Email</Label>
                <Input id="page-email" type="email" {...register('email')} placeholder="contact@exemple.fr" />
                {errors.email && <p role="alert" className="mt-1 text-xs text-danger-500">{errors.email.message}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="page-website">Site web</Label>
              <Input id="page-website" {...register('website')} placeholder="https://…" />
              {errors.website && <p role="alert" className="mt-1 text-xs text-danger-500">{errors.website.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={create.isPending}>
              {create.isPending ? 'Création…' : 'Créer la page'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
