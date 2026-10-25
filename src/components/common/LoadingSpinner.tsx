import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LoadingSpinner({ className, label = 'Chargement…' }: { className?: string; label?: string }) {
  return (
    <div role="status" aria-label={label} className={cn('flex items-center justify-center', className)}>
      <Loader2 className="h-6 w-6 animate-spin text-primary-600" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  )
}
