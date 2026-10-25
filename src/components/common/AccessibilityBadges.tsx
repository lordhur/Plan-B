import { Accessibility, Ear, Eye } from 'lucide-react'

interface Props {
  wheelchair?: boolean
  hearing?: boolean
  visually?: boolean
  showLabel?: boolean
}

/** Badges d'accessibilité (♿ PMR, malentendants, malvoyants). */
export function AccessibilityBadges({ wheelchair, hearing, visually, showLabel = false }: Props) {
  if (!wheelchair && !hearing && !visually) return null
  return (
    <>
      {wheelchair && (
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary-100 px-2.5 py-1 text-xs font-semibold text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300">
          <Accessibility className="h-3.5 w-3.5" aria-hidden />
          {showLabel ? 'Accessible PMR' : <span className="sr-only">Accessible fauteuil roulant</span>}
          {showLabel || <span aria-hidden>PMR</span>}
        </span>
      )}
      {hearing && (
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary-100 px-2.5 py-1 text-xs font-semibold text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300">
          <Ear className="h-3.5 w-3.5" aria-hidden />
          {showLabel ? 'Malentendants bienvenus' : <span className="sr-only">Adapté aux malentendants</span>}
          {showLabel || <span aria-hidden>Malent.</span>}
        </span>
      )}
      {visually && (
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary-100 px-2.5 py-1 text-xs font-semibold text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300">
          <Eye className="h-3.5 w-3.5" aria-hidden />
          {showLabel ? 'Malvoyants bienvenus' : <span className="sr-only">Adapté aux malvoyants</span>}
          {showLabel || <span aria-hidden>Malvoy.</span>}
        </span>
      )}
    </>
  )
}
