import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium leading-none tracking-normal transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-150',
        accent: 'bg-lemon-100 text-lemon-900 dark:bg-lemon-900/40 dark:text-lemon-300',
        outline: 'border border-border bg-transparent text-foreground-secondary',
        primary: 'bg-primary-50 text-primary',
        success: 'bg-success-bg text-success',
        warning: 'bg-warning-bg text-warning',
        error: 'bg-error-bg text-error',
        info: 'bg-info-bg text-info',
      },
      size: {
        default: 'h-6',
        sm: 'h-5 px-2 text-[11px]',
        lg: 'h-7 px-3 text-[13px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
