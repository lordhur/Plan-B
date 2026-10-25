import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary-100 text-primary-800 dark:bg-primary-950 dark:text-primary-200',
        secondary: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-200',
        accent: 'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200',
        success: 'bg-success-50 text-success-600 dark:bg-success-500/15',
        warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15',
        danger: 'bg-danger-50 text-danger-600 dark:bg-danger-500/15',
        outline: 'border border-border text-fg-muted',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
