'use client'

import { MailWarning, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

import { useLang } from '@/lib/i18n'
import { useCurrentUser } from '@/lib/session'

/**
 * BANNIÈRE « E-MAIL NON VÉRIFIÉ »
 *
 * Un compte dont l'adresse n'a pas encore été confirmée peut utiliser Plan B
 * normalement : on le rappelle discrètement en haut du contenu, avec un accès
 * direct à la page de vérification. Elle disparaît une fois l'e-mail vérifié
 * (ou si l'utilisateur la ferme pour la session en cours).
 */
export function VerifyEmailBanner() {
  const { user } = useCurrentUser()
  const { t } = useLang()
  const pathname = usePathname() ?? '/'
  const [dismissed, setDismissed] = React.useState(false)

  const storageKey = user ? `planb.verify.dismissed.${user.id}` : ''

  React.useEffect(() => {
    if (!storageKey) return
    try {
      setDismissed(sessionStorage.getItem(storageKey) === '1')
    } catch {
      /* stockage indisponible */
    }
  }, [storageKey])

  if (!user || user.emailVerified || dismissed) return null
  if (pathname.startsWith('/verify')) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      if (storageKey) sessionStorage.setItem(storageKey, '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      role="status"
      className="mx-4 mb-1 mt-4 flex items-center gap-2 rounded-xl border border-warning-500/40 bg-warning-50 px-3 py-2 text-[13px] dark:bg-warning-500/10 md:mx-auto md:max-w-2xl"
    >
      <MailWarning className="h-4 w-4 shrink-0 text-warning-600" aria-hidden />
      <p className="min-w-0 flex-1 text-fg">
        <span className="font-semibold">{t('verify_banner_title')}</span>{' '}
        <span className="text-fg-muted">{t('verify_banner_text')}</span>
      </p>
      <Link
        href="/verify"
        className="shrink-0 rounded-lg bg-warning-600 px-2.5 py-1 text-[12px] font-bold text-white transition-colors hover:bg-warning-700"
      >
        {t('verify_banner_cta')}
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('verify_banner_close')}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-black/5 hover:text-fg"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
