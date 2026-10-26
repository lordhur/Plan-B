'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Users } from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { toast } from '@/components/ui/toast'
import { CoverImageField } from '@/components/events/CoverImageField'

const schema = z.object({
  name: z.string().trim().min(3, 'Nom trop court').max(80),
  category: z.enum(['sport', 'nature', 'culture', 'food', 'jeux', 'voyage', 'parentalité', 'autre']),
  description: z.string().trim().max(2000).optional(),
  coverImage: z
    .string()
    .trim()
    .max(2048)
    .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//i.test(v), 'URL d’image invalide')
    .optional(),
  isPrivate: z.boolean(),
})

type FormValues = z.infer<typeof schema>

/** Création d'un groupe d'intérêt (compte vérifié requis). */
export default function NewGroupPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: loadingMe } = useCurrentUser()
  const create = trpc.groups.create.useMutation({
    onSuccess: (group) => {
      toast.success('Groupe créé !')
      router.push(`/groups/${group.slug}`)
    },
    onError: (e) => toast.error(e.message),
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'sport', isPrivate: false, coverImage: '' },
  })
  const isPrivate = watch('isPrivate')

  if (loadingMe) return <LoadingSpinner className="py-20" />
  if (!isAuthenticated) {
    return (
      <div className="py-16 text-center">
        <p className="text-fg-muted">Connectez-vous pour créer un groupe.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-8 md:px-0">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
        <Users className="h-6 w-6 text-primary-600" aria-hidden /> Créer un groupe
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rassemblez les passionnés</CardTitle>
          <CardDescription>Forum de discussion inclus — vous en serez l’administrateur.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit((values) => create.mutate({ ...values, coverImage: values.coverImage || undefined }))}>
            <div>
              <Label htmlFor="group-name">Nom *</Label>
              <Input id="group-name" {...register('name')} placeholder="Ex. : Randonneurs du Var" />
              {errors.name && <p role="alert" className="mt-1 text-xs text-danger-500">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="group-category">Catégorie *</Label>
              <Select id="group-category" {...register('category')}>
                <option value="sport">Sport</option>
                <option value="nature">Nature</option>
                <option value="culture">Culture</option>
                <option value="food">Gastronomie</option>
                <option value="jeux">Jeux</option>
                <option value="voyage">Voyage</option>
                <option value="parentalité">Parentalité</option>
                <option value="autre">Autre</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="group-description">Description</Label>
              <Textarea id="group-description" rows={3} {...register('description')} placeholder="À qui s’adresse ce groupe ?" />
            </div>
            <CoverImageField
              value={watch('coverImage') ?? ''}
              onChange={(url) => setValue('coverImage', url, { shouldDirty: true })}
            />
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-3.5">
              <Label htmlFor="group-private" className="cursor-pointer">
                Groupe privé
                <span className="block text-xs font-normal text-fg-muted">
                  Invisible dans l’annuaire — accès par lien direct uniquement.
                </span>
              </Label>
              <Switch id="group-private" checked={isPrivate} onCheckedChange={(v) => setValue('isPrivate', v)} />
            </div>
            <Button type="submit" className="w-full" disabled={create.isPending}>
              {create.isPending ? 'Création…' : 'Créer le groupe'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
