'use client'

import { UserPlus, UserCheck, UserMinus, UserX, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc'
import { toast } from '@/components/ui/toast'

export type FriendStatus = 'none' | 'friends' | 'pending_out' | 'pending_in' | 'self'

interface FriendButtonProps {
  userId: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'icon'
  showLabel?: boolean
  className?: string
}

/**
 * Bouton d'amitié adaptatif (spec Phase 2 §1.1) :
 *  - none → « Ajouter » envoie une demande
 *  - pending_out → « Annuler » retire la demande envoyée
 *  - pending_in → « Accepter » / « Refuser »
 *  - friends → badge « Amis », clic = retirer
 */
export function FriendButton({
  userId,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
  className,
}: FriendButtonProps) {
  const utils = trpc.useUtils()
  const statusQuery = trpc.friends.status.useQuery({ userId })
  const status: FriendStatus = statusQuery.data?.status ?? 'none'
  const requestId =
    statusQuery.data && 'requestId' in statusQuery.data ? statusQuery.data.requestId : undefined

  const invalidate = () => {
    void utils.friends.status.invalidate()
    void utils.friends.list.invalidate()
    void utils.friends.receivedRequests.invalidate()
    void utils.friends.sentRequests.invalidate()
  }

  const send = trpc.friends.send.useMutation({
    onSuccess: (res) => {
      if (res.status === 'ACCEPTED') {
        toast.success('Ami ajouté 🎉')
      } else {
        toast.success('Demande envoyée')
      }
      invalidate()
    },
    onError: (e) => toast.error(e.message),
  })
  const cancel = trpc.friends.cancel.useMutation({
    onSuccess: () => {
      toast.success('Demande annulée')
      invalidate()
    },
    onError: (e) => toast.error(e.message),
  })
  const accept = trpc.friends.accept.useMutation({
    onSuccess: () => {
      toast.success('Ami ajouté 🎉')
      invalidate()
    },
    onError: (e) => toast.error(e.message),
  })
  const decline = trpc.friends.decline.useMutation({
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(e.message),
  })
  const remove = trpc.friends.remove.useMutation({
    onSuccess: () => {
      toast.success('Ami retiré')
      invalidate()
    },
    onError: (e) => toast.error(e.message),
  })

  const busy =
    send.isPending || cancel.isPending || accept.isPending || decline.isPending || remove.isPending
  const spinner = busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null

  if (status === 'friends') {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled={busy}
        className={cn('text-emerald-600 hover:text-emerald-700 dark:text-emerald-400', className)}
        onClick={() => remove.mutate({ userId })}
        aria-label="Retirer de mes amis"
        title="Retirer de mes amis"
      >
        {spinner ?? <UserCheck aria-hidden className="h-4 w-4" />}
        {showLabel && <span className="ml-1.5">Amis</span>}
        {showLabel && <UserMinus aria-hidden className="ml-1 h-3.5 w-3.5 opacity-50" />}
      </Button>
    )
  }

  if (status === 'pending_out') {
    return (
      <Button
        variant="ghost"
        size={size}
        disabled={busy || !requestId}
        className={cn('text-muted-foreground', className)}
        onClick={() => requestId && cancel.mutate({ requestId })}
        aria-label="Annuler la demande d’ami"
      >
        {spinner ?? <UserX aria-hidden className="h-4 w-4" />}
        {showLabel && <span className="ml-1.5">Annuler</span>}
      </Button>
    )
  }

  if (status === 'pending_in') {
    return (
      <span className="inline-flex gap-1.5">
        <Button
          size={size}
          disabled={busy || !requestId}
          className="bg-primary/15 text-primary hover:bg-primary/25"
          onClick={() => requestId && accept.mutate({ requestId })}
          aria-label="Accepter la demande d’ami"
        >
          {spinner ?? <UserCheck aria-hidden className="h-4 w-4" />}
          {showLabel && <span className="ml-1.5">Accepter</span>}
        </Button>
        <Button
          variant="ghost"
          size={size}
          disabled={busy || !requestId}
          onClick={() => requestId && decline.mutate({ requestId })}
          aria-label="Refuser la demande d’ami"
        >
          <UserX aria-hidden className="h-4 w-4" />
        </Button>
      </span>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      disabled={busy}
      className={className}
      onClick={() => send.mutate({ userId })}
    >
      {spinner ?? <UserPlus aria-hidden className="h-4 w-4" />}
      {showLabel && <span className="ml-1.5">Ajouter</span>}
    </Button>
  )
}
