import { WifiOff } from 'lucide-react'
import { LogoMark } from '@/components/common/Logo'

export const metadata = { title: 'Hors ligne' }

/** Page de repli PWA quand l'appareil est hors ligne. */
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <LogoMark className="h-14 w-14" />
      <WifiOff className="h-10 w-10 text-fg-muted" aria-hidden />
      <h1 className="text-xl font-bold">Vous êtes hors ligne</h1>
      <p className="max-w-sm text-sm text-fg-muted">
        Vérifiez votre connexion pour découvrir les nouveaux plans autour de vous. Les pages déjà
        visitées restent accessibles.
      </p>
    </div>
  )
}
