import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * Action hierarchy, most to least emphasis:
 *   default   navy — the one primary action on a surface
 *   accent    lemon with ink text — readiness/commit moments (Start
 *             recording, Upload now). Never more than one per screen.
 *   secondary white with a hairline — alternatives to the primary
 *   ghost     no chrome — tertiary actions, toolbars
 *   quiet     tinted — in-context actions inside dense lists
 *   danger    destructive; always behind a confirmation
 *   link      inline navigation
 */
const buttonVariants = cva(
  'relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-md font-medium ring-offset-background transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%/0.08),0_1px_2px_hsl(var(--shadow-color)/0.12)] hover:bg-primary-600 active:bg-primary-700',
        accent:
          'bg-lemon text-lemon-foreground shadow-[inset_0_-1px_0_hsl(var(--lemon-foreground)/0.12)] hover:bg-lemon-400 active:bg-lemon-600',
        secondary:
          'border border-border bg-background-elevated text-foreground shadow-[0_1px_2px_hsl(var(--shadow-color)/0.05)] hover:border-border-strong hover:bg-background-hover active:bg-background-active',
        outline:
          'border border-border bg-background-elevated text-foreground hover:border-border-strong hover:bg-background-hover active:bg-background-active',
        ghost: 'bg-transparent text-foreground-secondary hover:bg-background-hover hover:text-foreground active:bg-background-active',
        quiet: 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:text-primary-700',
        danger: 'bg-error text-white hover:brightness-95 active:brightness-90',
        link: 'h-auto px-0 text-foreground-link underline-offset-4 hover:underline',
      },
      size: {
        xs: 'h-7 gap-1 px-2 text-[12px]',
        sm: 'h-control-sm gap-1.5 px-3 text-[13px]',
        default: 'h-control-md gap-2 px-4 text-[14px]',
        lg: 'h-control-lg gap-2 rounded-lg px-5 text-[15px]',
        xl: 'h-control-field gap-2.5 rounded-xl px-6 text-[16px]',
        icon: 'h-control-md w-10',
        'icon-sm': 'h-control-sm w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    if (asChild) {
      // Slot requires exactly one child element (e.g. a <Link>), so the
      // loading spinner is not injected here.
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }
    const Comp = 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
