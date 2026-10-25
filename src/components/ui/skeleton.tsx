import { cn } from '@/lib/utils'

/** Placeholder de chargement animé. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse-soft rounded-xl bg-border/60', className)} {...props} />
}
