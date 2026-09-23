import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border bg-background-elevated px-3 py-2.5 text-base leading-relaxed transition-[border-color,box-shadow] duration-fast sm:text-[14px]',
          'placeholder:text-foreground-tertiary',
          'focus-visible:border-border-focus focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15',
          'disabled:cursor-not-allowed disabled:opacity-45',
          error && 'border-error focus-visible:ring-error/15',
          !error && 'border-border hover:border-border-strong',
          className
        )}
        ref={ref}
        aria-invalid={error || undefined}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
