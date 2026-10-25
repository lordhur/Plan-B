'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { EventForm } from '@/components/events/EventForm'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useCurrentUser } from '@/lib/session'

/** CRÉER UN ÉVÉNEMENT — formulaire multi-étapes (réservé aux comptes vérifiés). */
export default function CreateEventPage() {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useCurrentUser()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace('/login?next=/events/create')
      return
    }
    if (user && !user.emailVerified) {
      router.replace('/verify')
    }
  }, [isLoading, isAuthenticated, user, router])

  if (isLoading) return <LoadingSpinner className="py-20" label="Chargement du formulaire" />
  if (!isAuthenticated || (user && !user.emailVerified)) return null

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Créer un plan</h1>
      <p className="mb-6 text-sm text-fg-muted">
        Postez ce que vous allez faire — les autres rejoignent en un clic. 🚀
      </p>
      <EventForm />
    </div>
  )
}
