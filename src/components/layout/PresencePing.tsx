'use client'

import * as React from 'react'

import { useCurrentUser } from '@/lib/session'
import { trpc } from '@/lib/trpc'

/**
 * Présence — signale régulièrement que le membre est actif, pour le point vert
 * « en ligne » de la messagerie. Une mesure toutes les 90 s, rien de plus.
 */
export function PresencePing() {
  const { isAuthenticated } = useCurrentUser()
  const ping = trpc.users.ping.useMutation()
  const pingRef = React.useRef(ping.mutate)
  pingRef.current = ping.mutate

  React.useEffect(() => {
    if (!isAuthenticated) return
    const send = () => {
      if (document.visibilityState === 'hidden') return
      pingRef.current(undefined)
    }
    send()
    const id = window.setInterval(send, 90_000)
    document.addEventListener('visibilitychange', send)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', send)
    }
  }, [isAuthenticated])

  return null
}
