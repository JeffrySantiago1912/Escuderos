import * as React from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'success' | 'destructive'
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const base =
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors'
    const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
      default: 'border-transparent bg-secondary text-secondary-foreground',
      outline: 'border-border/70 bg-transparent text-foreground',
      success: 'border-transparent bg-emerald-500/15 text-emerald-300',
      destructive: 'border-transparent bg-destructive/15 text-destructive-foreground',
    }

    return (
      <div
        ref={ref}
        className={cn(base, variants[variant], className)}
        {...props}
      />
    )
  },
)
Badge.displayName = 'Badge'

