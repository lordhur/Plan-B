'use client'

import { Check, Link2, MessageCircle, Share2 } from 'lucide-react'

/** Pictogramme X (ex-Twitter) — icône de marque absente de Lucide. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z" />
    </svg>
  )
}
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'

interface ShareEventModalProps {
  shareToken: string
  title: string
  trigger?: React.ReactNode
}

/**
 * Partage d'un plan : lien copiable, QR code, WhatsApp, X/Twitter,
 * et Web Share API (SMS/apps natives sur mobile).
 */
export function ShareEventModal({ shareToken, title, trigger }: ShareEventModalProps) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? `${window.location.origin}/join/${shareToken}` : `/join/${shareToken}`
  const text = `Rejoins mon plan « ${title} » sur PlanB !`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Lien copié !')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier le lien')
    }
  }

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'PlanB', text, url })
      } catch {
        /* partage annulé */
      }
    } else {
      void copy()
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="secondary">
            <Share2 className="h-4 w-4" aria-hidden /> Partager
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Partager ce plan</DialogTitle>
          <DialogDescription>
            Vos amis peuvent voir le plan et le rejoindre en un clic — même sans compte.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 overflow-y-auto py-2">
          <div className="rounded-2xl border border-border bg-white p-4" aria-label={`QR code vers ${title}`}>
            <QRCodeSVG value={url} size={160} marginSize={1} fgColor="#0f172a" bgColor="#ffffff" />
          </div>

          <div className="flex w-full items-center gap-2">
            <input
              readOnly
              value={url}
              aria-label="Lien de partage"
              className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-bg-secondary px-3 text-sm text-fg-muted"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button onClick={copy} variant={copied ? 'default' : 'secondary'} className="shrink-0">
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
              {copied ? 'Copié' : 'Copier'}
            </Button>
          </div>

          <div className="grid w-full grid-cols-3 gap-2">
            <Button
              variant="secondary"
              onClick={nativeShare}
              aria-label="Partager via les applications (SMS, WhatsApp…)"
            >
              <Share2 className="h-4 w-4" aria-hidden /> Apps / SMS
            </Button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg"
            >
              <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-fg-muted transition-colors hover:bg-bg-secondary hover:text-fg"
            >
              <XIcon className="h-3.5 w-3.5" /> X
            </a>
          </div>

          <p className="text-center text-xs text-fg-muted">
            Astuce : le QR code fonctionne sur les affiches et stories Instagram.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
