import Link from 'next/link'
import { cn } from '@/lib/utils'

/** Logo PlanB — carré arrondi violet + monogramme « B ». */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('h-9 w-9', className)} role="img" aria-label="PlanB">
      <defs>
        <linearGradient id="planb-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="13" fill="url(#planb-grad)" />
      <text
        x="24"
        y="32"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="800"
        fontSize="24"
        fill="white"
      >
        B
      </text>
    </svg>
  )
}

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2.5', className)} aria-label="PlanB — accueil">
      <LogoMark />
      {withText && (
        <span className="text-xl font-extrabold tracking-tight">
          Plan<span className="text-primary-600">B</span>
        </span>
      )}
    </Link>
  )
}
