import {
  Camera,
  Clapperboard,
  Dumbbell,
  Gamepad2,
  Hammer,
  Heart,
  Landmark,
  Mountain,
  Music,
  PartyPopper,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'

/** Noms d'icônes (lucide) stockés en base → vrais composants SVG. */
const ICONS: Record<string, LucideIcon> = {
  Dumbbell,
  UtensilsCrossed,
  Landmark,
  PartyPopper,
  Gamepad2,
  Mountain,
  Music,
  Heart,
  Clapperboard,
  Camera,
  Hammer,
  Sparkles,
}

/**
 * Icône de catégorie : rend le vrai logo SVG correspondant au nom lucide
 * enregistré en base (et non le mot lui-même).
 */
export function CategoryIcon({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const Icon = ICONS[name] ?? Sparkles
  return <Icon className={className} aria-hidden />
}
