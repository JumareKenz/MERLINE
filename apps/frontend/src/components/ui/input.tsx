import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // 16px on phones stops iOS zooming into the field on focus.
          'flex h-control-md w-full rounded-md border bg-background-elevated px-3 py-2 text-base ring-offset-background transition-[border-color,box-shadow] duration-fast sm:text-[14px]',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-foreground-tertiary',
          'focus-visible:border-border-focus focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15',
          'disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-background-surface',
          error && 'border-error focus-visible:border-error focus-visible:ring-error/15',
          !error && 'border-border hover:border-border-strong',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
