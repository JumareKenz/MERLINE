import type { ReactNode } from 'react';

interface FieldProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Label, control, hint and error in one consistent block. The control must
 * use `id` and, when there is a hint or error, `aria-describedby={describedBy(id, …)}`.
 */
export function Field({ id, label, hint, error, optional, children, className }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[14px] font-medium text-foreground">
        {label}
        {optional && <span className="font-normal text-foreground-tertiary"> (optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-foreground-tertiary">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[13px] text-foreground-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function describedBy(id: string, opts: { hint?: unknown; error?: unknown }) {
  if (opts.error) return `${id}-error`;
  if (opts.hint) return `${id}-hint`;
  return undefined;
}
