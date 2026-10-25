'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Loader2,
  MapPin,
  Rocket,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { createEventSchema } from '@/lib/validators'
import { GENDER_RESTRICTION_LABELS, REGISTRATION_TYPE_LABELS, VISIBILITY_LABELS } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// z.output : types après application des défauts Zod (tags: string[], dates Date)
type FormValues = z.output<typeof createEventSchema>

const STEPS = ['Les bases', 'Quand et où', 'Qui peut venir', 'Accessibilité', 'Prix', 'Aperçu']

/** Recherche d'adresse via Nominatim (OpenStreetMap — gratuit, sans clé). */
interface NominatimResult {
  display_name: string
  lat: string
  lon: string
  address?: { city?: string; town?: string; village?: string; postcode?: string }
}

function useAddressSearch() {
  const [results, setResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)

  const search = async (query: string) => {
    if (query.length < 3) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=fr&limit=5`,
        { headers: { Accept: 'application/json' } },
      )
      if (res.ok) setResults(await res.json())
    } catch {
      setResults([]) // hors ligne : saisie manuelle possible
    } finally {
      setSearching(false)
    }
  }

  return { results, searching, search, clear: () => setResults([]) }
}

export function EventForm() {
  const router = useRouter()
  const utils = trpc.useUtils()
  const { data: categories } = trpc.events.categories.useQuery()
  const [step, setStep] = useState(0)
  const [isOnline, setIsOnline] = useState(false)
  const [addressQuery, setAddressQuery] = useState('')
  const { results, searching, search, clear } = useAddressSearch()

  const create = trpc.events.create.useMutation({
    onSuccess: (res) => {
      void utils.events.feed.invalidate()
      toast.success('Plan publié ! 🚀', 'Partagez-le pour remplir vos places.')
      router.push(`/events/${res.slug}`)
    },
    onError: (err) => toast.error('Publication impossible', err.message),
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(createEventSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      title: '',
      categoryId: '',
      description: '',
      shortDescription: '',
      tags: [] as string[],
      startDate: undefined as unknown as Date,
      endDate: null,
      locationName: '',
      address: '',
      city: '',
      latitude: 43.5377,
      longitude: 6.4643,
      isOnline: false,
      maxParticipants: 10,
      minParticipants: 1,
      registrationType: 'OPEN',
      minAge: null,
      maxAge: null,
      genderRestriction: 'ALL',
      minRating: null,
      wheelchairAccessible: false,
      hearingAccessible: false,
      visuallyAccessible: false,
      accessibilityNotes: '',
      visibility: 'PUBLIC',
      isFree: true,
      price: null,
      isDraft: false,
    },
    mode: 'onTouched',
  })

  const { control, register, handleSubmit, watch, setValue, formState, trigger } = form
  const { errors } = formState
  // useFieldArray ne gère pas les tableaux de primitives → état local synchronisé
  const [tagFields, setTagFields] = useState<string[]>([])
  const appendTag = (tag: string) => {
    const next = [...tagFields, tag]
    setTagFields(next)
    setValue('tags', next)
  }
  const removeTag = (index: number) => {
    const next = tagFields.filter((_, i) => i !== index)
    setTagFields(next)
    setValue('tags', next)
  }

  const values = watch()
  const startStr = values.startDate ? new Date(values.startDate as unknown as string) : null

  // Champs validés avant de passer à l'étape suivante
  const STEP_FIELDS: (keyof FormValues)[][] = [
    ['title', 'categoryId', 'description'],
    ['startDate', 'locationName', 'address', 'city', 'latitude', 'longitude'],
    ['registrationType'],
    ['visibility'],
    ['isFree', 'price'],
    [],
  ]

  const nextStep = async () => {
    const fields = STEP_FIELDS[step] ?? []
    const ok = fields.length === 0 ? true : await trigger(fields as never)
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1))
    else toast.error('Vérifiez les champs en rouge')
  }

  const onSubmit = (data: FormValues) => {
    create.mutate(data as never)
  }

  const err = (name: keyof FormValues) =>
    errors[name]?.message ? (
      <p role="alert" className="mt-1 text-xs font-medium text-danger-500">
        {String(errors[name]?.message)}
      </p>
    ) : null

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Indicateur d'étapes */}
      <nav aria-label="Étapes du formulaire" className="mb-6">
        <ol className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          {STEPS.map((label, i) => (
            <li key={label} className="flex-1">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                aria-current={i === step ? 'step' : undefined}
                className={`w-full rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                  i === step
                    ? 'bg-primary-600 text-white'
                    : i < step
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                      : 'bg-bg-secondary text-fg-muted'
                }`}
              >
                <span className="hidden sm:inline">
                  {i + 1}. {label}
                </span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>
            Étape {step + 1} — {STEPS[step]}
          </CardTitle>
          <CardDescription>
            {step === 0 && 'Donnez envie en une phrase : quoi, quelle ambiance ?'}
            {step === 1 && 'Précisez le moment et le lieu de votre plan.'}
            {step === 2 && 'Définissez qui peut rejoindre votre plan.'}
            {step === 3 && 'Rendez votre plan accessible au plus grand nombre.'}
            {step === 4 && 'Gratuit ou payant — PlanB prend 5 % sur les événements payants.'}
            {step === 5 && 'Dernière vérification avant le décollage !'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* ---------- ÉTAPE 1 : LES BASES ---------- */}
          {step === 0 && (
            <>
              <div>
                <Label htmlFor="title">Titre du plan *</Label>
                <Input
                  id="title"
                  placeholder="Ex : Footing samedi 9h au parc"
                  aria-invalid={!!errors.title}
                  {...register('title')}
                />
                {err('title')}
              </div>

              <div>
                <Label htmlFor="categoryId">Catégorie *</Label>
                <Select id="categoryId" aria-invalid={!!errors.categoryId} {...register('categoryId')}>
                  <option value="">Choisir une catégorie…</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                {err('categoryId')}
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  rows={5}
                  placeholder="Déroulé, ce qu'il faut apporter, l'ambiance…"
                  aria-invalid={!!errors.description}
                  {...register('description')}
                />
                {err('description')}
              </div>

              <div>
                <Label htmlFor="tags-input">Tags (jusqu’à 8)</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {tagFields.map((tag, i) => (
                    <span
                      key={`${tag}-${i}`}
                      className="inline-flex items-center gap-1 rounded-full bg-primary-100 py-1 pl-3 pr-1.5 text-xs font-semibold text-primary-800 dark:bg-primary-950 dark:text-primary-200"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(i)}
                        className="rounded-full p-0.5 hover:bg-primary-200 dark:hover:bg-primary-900"
                        aria-label={`Retirer le tag ${tag}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <Input
                  id="tags-input"
                  placeholder="Tapez un tag puis Entrée (ex : running)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const v = e.currentTarget.value.trim()
                      if (v && tagFields.length < 8) {
                        appendTag(v)
                        e.currentTarget.value = ''
                      }
                    }
                  }}
                />
              </div>
            </>
          )}

          {/* ---------- ÉTAPE 2 : QUAND ET OÙ ---------- */}
          {step === 1 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="startDate">Date et heure de début *</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    aria-invalid={!!errors.startDate}
                    {...register('startDate', { valueAsDate: true })}
                  />
                  {err('startDate')}
                </div>
                <div>
                  <Label htmlFor="endDate">Date et heure de fin (optionnel)</Label>
                  <Input id="endDate" type="datetime-local" {...register('endDate', { valueAsDate: true })} />
                  {err('endDate')}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
                <div>
                  <Label htmlFor="isOnline">Événement en ligne</Label>
                  <p className="text-xs text-fg-muted">Pas de lieu physique, un lien suffit.</p>
                </div>
                <Switch
                  id="isOnline"
                  checked={isOnline}
                  onCheckedChange={(v) => {
                    setIsOnline(v)
                    setValue('isOnline', v)
                    if (v) {
                      setValue('locationName', 'En ligne')
                      setValue('address', 'En ligne')
                      setValue('city', 'En ligne')
                    }
                  }}
                />
              </div>

              {!isOnline ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Label htmlFor="address-search">Rechercher une adresse</Label>
                    <div className="relative mt-1.5">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" aria-hidden />
                      <Input
                        id="address-search"
                        className="pl-9"
                        placeholder="Ex : 12 place René Cassin, Draguignan"
                        value={addressQuery}
                        onChange={(e) => {
                          setAddressQuery(e.target.value)
                          void search(e.target.value)
                        }}
                      />
                      {searching && (
                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-fg-muted" aria-hidden />
                      )}
                    </div>
                    {results.length > 0 && (
                      <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-card-hover">
                        {results.map((r) => (
                          <li key={`${r.lat}-${r.lon}`}>
                            <button
                              type="button"
                              className="flex w-full items-start gap-2 px-3.5 py-2.5 text-left text-sm hover:bg-bg-secondary"
                              onClick={() => {
                                setValue('address', r.display_name)
                                setValue('latitude', parseFloat(r.lat))
                                setValue('longitude', parseFloat(r.lon))
                                const city = r.address?.city ?? r.address?.town ?? r.address?.village
                                if (city) setValue('city', city)
                                if (r.address?.postcode) setValue('zipCode', r.address.postcode)
                                setValue('locationName', r.display_name.split(',')[0] ?? 'Lieu')
                                setAddressQuery(r.display_name)
                                clear()
                              }}
                            >
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" aria-hidden />
                              <span className="line-clamp-2">{r.display_name}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="locationName">Nom du lieu *</Label>
                      <Input id="locationName" placeholder="Ex : Parc Haussmann" aria-invalid={!!errors.locationName} {...register('locationName')} />
                      {err('locationName')}
                    </div>
                    <div>
                      <Label htmlFor="city">Ville *</Label>
                      <Input id="city" placeholder="Ex : Draguignan" aria-invalid={!!errors.city} {...register('city')} />
                      {err('city')}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Adresse complète *</Label>
                    <Input id="address" aria-invalid={!!errors.address} {...register('address')} />
                    {err('address')}
                    <p className="mt-1 text-xs text-fg-muted">
                      📍 {Number(values.latitude).toFixed(4)}, {Number(values.longitude).toFixed(4)} — utilisez la
                      recherche pour géolocaliser précisément.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="onlineLink">Lien de l’événement (visio, stream…)</Label>
                  <Input id="onlineLink" placeholder="https://" {...register('onlineLink')} />
                </div>
              )}
            </>
          )}

          {/* ---------- ÉTAPE 3 : QUI PEUT VENIR ---------- */}
          {step === 2 && (
            <>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label htmlFor="maxParticipants">Nombre de places</Label>
                  <span className="text-sm font-semibold text-primary-600">
                    {values.maxParticipants ?? '∞'} {values.maxParticipants === 5000 ? '(illimité)' : 'places'}
                  </span>
                </div>
                <Controller
                  control={control}
                  name="maxParticipants"
                  render={({ field }) => (
                    <Slider
                      min={1}
                      max={100}
                      step={1}
                      value={[Math.min(Number(field.value ?? 10), 100)]}
                      onValueChange={([v]) => field.onChange(v === 100 ? 5000 : v)}
                      aria-label="Nombre de places"
                    />
                  )}
                />
              </div>

              <div>
                <Label htmlFor="registrationType">Type d’inscription</Label>
                <Select id="registrationType" {...register('registrationType')}>
                  {Object.entries(REGISTRATION_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Restriction d’âge</Label>
                  <span className="text-sm font-semibold text-primary-600">
                    {values.minAge ?? 0} – {values.maxAge ?? 99} ans
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minAge" className="text-xs text-fg-muted">Âge minimum (0 = aucun)</Label>
                    <Input id="minAge" type="number" min={0} max={120} {...register('minAge', { valueAsNumber: true })} />
                  </div>
                  <div>
                    <Label htmlFor="maxAge" className="text-xs text-fg-muted">Âge maximum (vide = aucun)</Label>
                    <Input
                      id="maxAge"
                      type="number"
                      min={0}
                      max={120}
                      {...register('maxAge', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="genderRestriction">Restriction de genre</Label>
                <Select id="genderRestriction" {...register('genderRestriction')}>
                  {Object.entries(GENDER_RESTRICTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label htmlFor="minRating">Note de profil minimale</Label>
                  <span className="text-sm font-semibold text-primary-600">
                    {values.minRating ? `≥ ${Number(values.minRating).toFixed(1)} ★` : 'Aucune'}
                  </span>
                </div>
                <Controller
                  control={control}
                  name="minRating"
                  render={({ field }) => (
                    <Slider
                      min={0}
                      max={5}
                      step={0.5}
                      value={[Number(field.value ?? 0)]}
                      onValueChange={([v]) => field.onChange(v === 0 ? null : v)}
                      aria-label="Note de profil minimale"
                    />
                  )}
                />
              </div>
            </>
          )}

          {/* ---------- ÉTAPE 4 : ACCESSIBILITÉ & OPTIONS ---------- */}
          {step === 3 && (
            <>
              {(
                [
                  ['wheelchairAccessible', 'Accessible fauteuil roulant (PMR)'],
                  ['hearingAccessible', 'Adapté aux personnes malentendantes'],
                  ['visuallyAccessible', 'Adapté aux personnes malvoyantes'],
                ] as const
              ).map(([name, label]) => (
                <div key={name} className="flex items-center justify-between rounded-xl border border-border p-3.5">
                  <Label htmlFor={name}>{label}</Label>
                  <Controller
                    control={control}
                    name={name}
                    render={({ field }) => (
                      <Switch id={name} checked={!!field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              ))}

              <div>
                <Label htmlFor="accessibilityNotes">Notes d’accessibilité</Label>
                <Textarea
                  id="accessibilityNotes"
                  rows={3}
                  placeholder="Ex : rampe à l'entrée, parking à 50 m…"
                  {...register('accessibilityNotes')}
                />
              </div>

              <div>
                <Label htmlFor="visibility">Visibilité</Label>
                <Select id="visibility" {...register('visibility')}>
                  {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </>
          )}

          {/* ---------- ÉTAPE 5 : PRIX ---------- */}
          {step === 4 && (
            <>
              <div className="flex items-center justify-between rounded-xl border border-border p-3.5">
                <div>
                  <Label htmlFor="isFree">Événement gratuit</Label>
                  <p className="text-xs text-fg-muted">Désactivez pour faire payer les participants.</p>
                </div>
                <Controller
                  control={control}
                  name="isFree"
                  render={({ field }) => (
                    <Switch id="isFree" checked={!!field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>

              {!values.isFree && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="price">Prix par participant (€) *</Label>
                    <Input
                      id="price"
                      type="number"
                      min={0}
                      step="0.5"
                      placeholder="Ex : 15"
                      aria-invalid={!!errors.price}
                      {...register('price', { valueAsNumber: true })}
                    />
                    {err('price')}
                  </div>
                  <div className="rounded-xl bg-bg-secondary p-4 text-sm">
                    <p className="font-semibold">Simulation des revenus</p>
                    <ul className="mt-2 space-y-1 text-fg-muted">
                      <li>
                        Prix : {formatPrice(values.price, false)} × {values.maxParticipants ?? 0} places
                      </li>
                      <li>Commission PlanB (5 %) : -{((Number(values.price) || 0) * 0.05).toFixed(2)} € / place</li>
                      <li className="font-semibold text-success-600">
                        Vous recevez : {((Number(values.price) || 0) * 0.95).toFixed(2)} € / place
                      </li>
                    </ul>
                    <p className="mt-2 text-xs">
                      💳 Paiement Stripe activé en Phase 4 — les événements payants fonctionnent en mode gratuit
                      jusqu’au branchement.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ---------- ÉTAPE 6 : APERÇU ---------- */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-bg-secondary p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-primary-600">
                  {categories?.find((c) => c.id === values.categoryId)?.name ?? 'Catégorie'}
                </p>
                <h3 className="mt-1 text-lg font-bold">{values.title || 'Titre de votre plan'}</h3>
                <dl className="mt-3 space-y-1.5 text-sm text-fg-muted">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" aria-hidden />
                    <dd>{startStr ? startStr.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' }) : 'Date à définir'}</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" aria-hidden />
                    <dd>
                      {values.isOnline ? 'En ligne' : `${values.locationName || 'Lieu'}, ${values.city || 'Ville'}`}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm">
                  {values.description || 'Votre description apparaîtra ici.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold text-fg-muted">
                  <span className="rounded-full bg-bg px-2.5 py-1">
                    {values.maxParticipants && values.maxParticipants < 5000
                      ? `${values.maxParticipants} places`
                      : 'Places illimitées'}
                  </span>
                  <span className="rounded-full bg-bg px-2.5 py-1">{formatPrice(values.price, !!values.isFree)}</span>
                  <span className="rounded-full bg-bg px-2.5 py-1">
                    {REGISTRATION_TYPE_LABELS[values.registrationType ?? 'OPEN']}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Précédent
        </Button>

        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={nextStep}>
            Suivant <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={create.isPending}
              onClick={handleSubmit((data) => create.mutate({ ...data, isDraft: true } as never))}
            >
              Brouillon
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Rocket className="h-4 w-4" aria-hidden />
              )}
              Publier le plan
            </Button>
          </div>
        )}
      </div>
    </form>
  )
}
