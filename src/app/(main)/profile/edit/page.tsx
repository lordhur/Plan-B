'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MapPin, Save, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/toast'
import { useCurrentUser } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

const profileFormSchema = z.object({
  displayName: z.string().trim().max(60),
  bio: z.string().trim().max(500),
  city: z.string().trim().max(80),
  phone: z.string().max(20),
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER', 'PREFER_NOT_TO_SAY']).nullish(),
  orientation: z.enum(['HETEROSEXUAL', 'HOMOSEXUAL', 'BISEXUAL', 'OTHER']).nullish(),
  showAge: z.boolean(),
  showLastName: z.boolean(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
})
type ProfileForm = z.infer<typeof profileFormSchema>

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
}

/** ÉDITION DU PROFIL — infos personnelles + localisation. */
export default function ProfileEditPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: sessionLoading } = useCurrentUser()
  const utils = trpc.useUtils()
  const [cityQuery, setCityQuery] = useState('')
  const [cityResults, setCityResults] = useState<NominatimResult[]>([])

  const { data: me } = trpc.auth.me.useQuery(undefined, { enabled: isAuthenticated })

  const { register, handleSubmit, setValue, watch, reset } = useForm<ProfileForm>({
    resolver: zodResolver(profileFormSchema),
  })

  useEffect(() => {
    if (me) {
      reset({
        displayName: me.displayName ?? '',
        bio: me.bio ?? '',
        city: me.city ?? '',
        phone: me.phone ?? '',
        gender: me.gender ?? null,
        orientation: me.orientation ?? null,
        showAge: me.showAge,
        showLastName: me.showLastName,
        latitude: me.latitude ?? null,
        longitude: me.longitude ?? null,
      })
    }
  }, [me, reset])

  const update = trpc.users.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate()
      toast.success('Profil mis à jour ✓')
      router.push('/profile')
    },
    onError: (err) => toast.error(err.message),
  })

  const searchCity = async (query: string) => {
    setCityQuery(query)
    if (query.length < 3) {
      setCityResults([])
      return
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=fr&limit=4`,
      )
      if (res.ok) setCityResults(await res.json())
    } catch {
      setCityResults([])
    }
  }

  const lat = watch('latitude')
  const lon = watch('longitude')

  const locateMe = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue('latitude', pos.coords.latitude)
        setValue('longitude', pos.coords.longitude)
        toast.success('Position enregistrée 📍')
      },
      () => toast.error('Géolocalisation refusée'),
    )
  }

  if (sessionLoading) return <LoadingSpinner className="py-20" />
  if (!isAuthenticated) return null

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Modifier mon profil</h1>
      <p className="mb-6 text-sm text-fg-muted">Ces infos aident les autres à vous connaître.</p>

      <form
        onSubmit={handleSubmit((data) =>
          update.mutate({
            ...data,
            gender: data.gender ?? undefined,
            orientation: data.orientation ?? undefined,
          }),
        )}
        className="space-y-5"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="displayName">Pseudo (optionnel)</Label>
              <Input id="displayName" placeholder="Comment voulez-vous apparaître ?" {...register('displayName')} />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" rows={3} maxLength={500} placeholder="Parlez-nous de vous en quelques mots…" {...register('bio')} />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" type="tel" placeholder="+33 6 12 34 56 78" {...register('phone')} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="gender">Genre</Label>
                <Select id="gender" {...register('gender')} defaultValue="">
                  <option value="" disabled>
                    Choisir…
                  </option>
                  <option value="MALE">Homme</option>
                  <option value="FEMALE">Femme</option>
                  <option value="NON_BINARY">Autre</option>
                  <option value="PREFER_NOT_TO_SAY">Préfère ne pas le dire</option>
                </Select>
                <p className="mt-1 text-xs text-fg-muted">Visible sur votre profil public.</p>
              </div>
              <div>
                <Label htmlFor="orientation">Orientation</Label>
                <Select id="orientation" {...register('orientation')} defaultValue="">
                  <option value="" disabled>
                    Choisir…
                  </option>
                  <option value="HETEROSEXUAL">Hétérosexuel·le</option>
                  <option value="HOMOSEXUAL">Homosexuel·le</option>
                  <option value="BISEXUAL">Bisexuel·le</option>
                  <option value="OTHER">Autre</option>
                </Select>
                <p className="mt-1 text-xs text-fg-muted">
                  Aide à vous proposer des membres pertinents.
                </p>
              </div>
              <p className="mt-1 text-xs text-fg-muted">
                Utilisé pour la vérification (badge Profil vérifié) et les alerts de dernière minute.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-primary-600" aria-hidden /> Localisation
            </CardTitle>
            <CardDescription>Pour voir les plans autour de vous dans le fil.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Label htmlFor="city-search">Ma ville</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" aria-hidden />
                <Input
                  id="city-search"
                  className="pl-9"
                  placeholder="Ex : Draguignan"
                  value={cityQuery}
                  onChange={(e) => void searchCity(e.target.value)}
                />
              </div>
              {cityResults.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-card-hover">
                  {cityResults.map((r) => (
                    <li key={`${r.lat}-${r.lon}`}>
                      <button
                        type="button"
                        className="w-full px-3.5 py-2.5 text-left text-sm hover:bg-bg-secondary"
                        onClick={() => {
                          const city = r.display_name.split(',').slice(-3)[0]?.trim() ?? r.display_name
                          setValue('city', city)
                          setValue('latitude', parseFloat(r.lat))
                          setValue('longitude', parseFloat(r.lon))
                          setCityQuery(r.display_name)
                          setCityResults([])
                        }}
                      >
                        {r.display_name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Input type="hidden" {...register('city')} />

            <Button type="button" variant="secondary" className="w-full" onClick={locateMe}>
              <MapPin className="h-4 w-4" aria-hidden /> Utiliser ma position GPS
            </Button>

            {lat != null && lon != null && (
              <p className="text-center text-xs text-fg-muted">
                📍 Position enregistrée : {Number(lat).toFixed(4)}, {Number(lon).toFixed(4)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visibilité du profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="showAge">Afficher mon âge</Label>
              <Switch id="showAge" {...register('showAge')} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showLastName">Afficher mon nom complet</Label>
              <Switch id="showLastName" {...register('showLastName')} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Annuler
          </Button>
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  )
}
