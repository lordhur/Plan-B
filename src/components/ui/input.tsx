import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

/** Champ de texte — hauteur ≥ 44 px (cible tactile WCAG). */
const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-xl border border-border bg-bg px-3.5 py-2 text-sm transition-colors',
        'placeholder:text-fg-muted/70',
        'focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-danger-500',
        className,
      )}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
