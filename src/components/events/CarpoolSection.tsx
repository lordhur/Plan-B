'use client'

import { Car, MapPin, Plus, Trash2, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { useCurrentUser } from '@/lib/session'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/toast'
import { formatEventDate } from '@/lib/date'

interface CarpoolSectionProps {
  eventId: string
  /** Le visiteur est participant confirmé ou organisateur. */
  canParticipate: boolean
}

/** Section covoiturage de la page événement (spec Phase 3 §3.3). */
export function CarpoolSection({ eventId, canParticipate }: CarpoolSectionProps) {
  const { user } = useCurrentUser()
  const utils = trpc.useUtils()
  const offers = trpc.carpool.offers.useQuery({ eventId })
  const [showForm, setShowForm] = useState(false)

  const invalidate = () => void utils.carpool.offers.invalidate({ eventId })

  const request = trpc.carpool.request.useMutation({
    onSuccess: () => {
      toast.success('Demande envoyée au conducteur')
      invalidate()
    },
    onError: (e) => toast.error(e.message),
  })
  const respond = trpc.carpool.respond.useMutation({
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(e.message),
  })
  const cancelRequest = trpc.carpool.cancelRequest.useMutation({
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(e.message),
  })
  const deleteOffer = trpc.carpool.deleteOffer.useMutation({
    onSuccess: () => {
      toast.success('Trajet supprimé')
      invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  const myOffer = offers.data?.find((o) => o.driverId === user?.id)

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Car className="h-4 w-4 text-primary-600" aria-hidden /> Covoiturage
        </CardTitle>
        {canParticipate && !myOffer && (
          <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4" aria-hidden /> Proposer un trajet
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && canParticipate && <OfferForm eventId={eventId} onDone={() => { setShowForm(false); invalidate() }} />}

        {!offers.data || offers.data.length === 0 ? (
          <p className="text-sm text-fg-muted">
            {canParticipate
              ? 'Aucun trajet proposé — soyez le premier à proposer un covoiturage !'
              : 'Aucun trajet proposé pour le moment.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {offers.data.map((offer) => {
              const isDriver = offer.driverId === user?.id
              const seatsLeft = offer.availableSeats - offer.acceptedSeats
              return (
                <li key={offer.id} className="rounded-xl border border-border p-3.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar src={offer.driver.avatarUrl} name={`${offer.driver.firstName} ${offer.driver.lastName}`} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {offer.driver.firstName} · ⭐ {offer.driver.averageRating.toFixed(1)}
                      </span>
                      <span className="block text-xs text-fg-muted">
                        <MapPin className="mr-0.5 inline h-3 w-3" aria-hidden />
                        {offer.departurePoint} — {formatEventDate(offer.departureTime)}
                      </span>
                    </span>
                    <span className="text-right text-xs text-fg-muted">
                      <span className="block font-bold text-fg">
                        {seatsLeft} place{seatsLeft > 1 ? 's' : ''}
                      </span>
                      {offer.pricePerSeat > 0 ? `${offer.pricePerSeat.toFixed(2)} €/place` : 'Gratuit'}
                    </span>
                  </div>

                  {offer.notes && <p className="mt-2 text-xs italic text-fg-muted">« {offer.notes} »</p>}

                  {/* Demandes (visibles par le conducteur) */}
                  {isDriver && offer.requests.length > 0 && (
                    <ul className="mt-3 space-y-2 border-t border-border pt-3">
                      {offer.requests.map((r) => (
                        <li key={r.id} className="flex items-center gap-2 text-sm">
                          <Avatar src={r.passenger.avatarUrl} name={r.passenger.firstName} size="sm" className="h-6 w-6 text-[10px]" />
                          <span className="flex-1">
                            {r.passenger.firstName} · {r.seatsRequested} place(s)
                            {r.status === 'ACCEPTED' && <span className="ml-1 font-semibold text-emerald-600">✓ acceptée</span>}
                          </span>
                          {r.status === 'PENDING' && (
                            <span className="flex gap-1">
                              <Button size="sm" variant="outline" aria-label="Accepter" onClick={() => respond.mutate({ requestId: r.id, accept: true })}>
                                ✓
                              </Button>
                              <Button size="sm" variant="ghost" aria-label="Refuser" onClick={() => respond.mutate({ requestId: r.id, accept: false })}>
                                <X className="h-3.5 w-3.5" aria-hidden />
                              </Button>
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Actions passager */}
                  {canParticipate && !isDriver && (
                    <div className="mt-3">
                      {!offer.myRequest ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={seatsLeft <= 0 || request.isPending}
                          onClick={() => request.mutate({ offerId: offer.id, seatsRequested: 1 })}
                        >
                          <UserPlus className="h-4 w-4" aria-hidden /> Demander une place
                        </Button>
                      ) : offer.myRequest.status === 'PENDING' ? (
                        <span className="flex items-center gap-2 text-xs text-fg-muted">
                          Demande en attente…
                          <Button size="sm" variant="ghost" onClick={() => cancelRequest.mutate({ requestId: offer.myRequest!.id })}>
                            Annuler
                          </Button>
                        </span>
                      ) : offer.myRequest.status === 'ACCEPTED' ? (
                        <p className="text-sm font-semibold text-emerald-600">✓ Place confirmée !</p>
                      ) : offer.myRequest.status === 'DECLINED' ? (
                        <p className="text-xs text-fg-muted">Demande refusée</p>
                      ) : null}
                    </div>
                  )}

                  {isDriver && (
                    <div className="mt-3 border-t border-border pt-3">
                      <Button size="sm" variant="ghost" className="text-danger-500" onClick={() => deleteOffer.mutate({ offerId: offer.id })}>
                        <Trash2 className="h-4 w-4" aria-hidden /> Supprimer mon trajet
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function OfferForm({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const [departurePoint, setDeparturePoint] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [seats, setSeats] = useState(3)
  const [price, setPrice] = useState(0)
  const [notes, setNotes] = useState('')
  const create = trpc.carpool.createOffer.useMutation({
    onSuccess: () => {
      toast.success('Trajet publié 🚗')
      onDone()
    },
    onError: (e) => toast.error(e.message),
  })

  const geocode = async () => {
    if (departurePoint.trim().length < 3) return
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(departurePoint)}`,
      )
      const data = await res.json()
      if (Array.isArray(data) && data[0]) {
        create.mutate({
          eventId,
          departurePoint,
          departureLatitude: Number(data[0].lat),
          departureLongitude: Number(data[0].lon),
          departureTime: new Date(departureTime),
          availableSeats: seats,
          pricePerSeat: price,
          notes: notes.trim() || undefined,
        })
      } else {
        toast.error('Adresse introuvable — précisez la ville')
      }
    } catch {
      toast.error('Géocodage impossible — réessayez')
    }
  }

  return (
    <form
      className="space-y-3 rounded-xl border border-border bg-bg-secondary p-3.5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!departureTime) {
          toast.error('Choisissez une heure de départ')
          return
        }
        void geocode()
      }}
    >
      <Label htmlFor="carpool-point">Point de départ</Label>
      <Input
        id="carpool-point"
        required
        value={departurePoint}
        onChange={(e) => setDeparturePoint(e.target.value)}
        placeholder="Ex. : Place René Cassin, Draguignan"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="carpool-time">Départ</Label>
          <Input id="carpool-time" type="datetime-local" required value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="carpool-seats">Places</Label>
          <Input id="carpool-seats" type="number" min={1} max={8} value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="carpool-price">Prix / place (€)</Label>
          <Input id="carpool-price" type="number" min={0} max={100} step="0.5" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="carpool-notes">Note (optionnel)</Label>
          <Input id="carpool-notes" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex. : je passe par Lorgues" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={create.isPending}>
          {create.isPending ? 'Publication…' : 'Publier le trajet'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </form>
  )
}
