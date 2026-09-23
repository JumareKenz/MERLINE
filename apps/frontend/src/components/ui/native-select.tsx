import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

/**
 * The platform select, styled to match Input. Preferred for forms: it gets
 * the native picker on phones, full keyboard support and screen-reader
 * semantics for free.
 */
export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={error || undefined}
        className={cn(
          'h-control-md w-full appearance-none rounded-md border bg-background-elevated pl-3 pr-9 text-base text-foreground transition-[border-color,box-shadow] duration-fast sm:text-[14px]',
          'focus-visible:border-border-focus focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15',
          'disabled:cursor-not-allowed disabled:opacity-45',
          error ? 'border-error' : 'border-border hover:border-border-strong',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-tertiary" aria-hidden />
    </div>
  ),
);
NativeSelect.displayName = 'NativeSelect';
