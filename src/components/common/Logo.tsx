import Link from 'next/link'

import { cn } from '@/lib/utils'

/**
 * Logo PlanB — le vrai logo de la marque (disque dégradé violet → orange avec
 * le « B » en bulle de discussion), fourni par le produit.
 *
 * L'image est servie depuis `/public/brand` (512 px, PNG optimisé) : elle reste
 * nette jusqu'à 256 px affichés, donc sur écran Retina également.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo-planb.png"
      alt=""
      width={384}
      height={384}
      decoding="async"
      draggable={false}
      // `bg-transparent` : le PNG garde son tour transparent (aucun fond ajouté).
      className={cn(
        'h-10 w-10 select-none bg-transparent object-contain drop-shadow-[0_1px_2px_rgba(15,23,42,0.18)]',
        className,
      )}
    />
  )
}

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <Link
      href="/"
      className={cn('flex items-center gap-2.5', className)}
      aria-label="PlanB — accueil"
    >
      <LogoMark />
      {withText && (
        <span className="text-xl font-extrabold tracking-tight">
          Plan<span className="text-primary-600">B</span>
        </span>
      )}
    </Link>
  )
}
