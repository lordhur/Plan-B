'use client'

import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-primary-600 via-primary-600 to-secondary-600 text-white shadow-sm transition-all hover:shadow-glow hover:brightness-110 active:scale-[0.98]',
        secondary:
          'bg-bg-secondary text-fg border border-border hover:bg-border/50 active:scale-[0.98]',
        accent:
          'bg-gradient-to-r from-accent-500 to-amber-500 text-white shadow-sm transition-all hover:shadow-glow-accent hover:brightness-110 active:scale-[0.98]',
        outline:
          'border border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 active:scale-[0.98]',
        ghost: 'hover:bg-bg-secondary text-fg-muted hover:text-fg',
        destructive: 'bg-danger-500 text-white hover:bg-danger-600 active:scale-[0.98]',
        link: 'text-primary-600 underline-offset-4 hover:underline h-auto! min-h-0!',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-8 text-base',
        icon: 'h-11 w-11 p-0',
        'icon-sm': 'h-9 w-9 p-0 min-h-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
