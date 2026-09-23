import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  /** One obvious next action. */
  action?: ReactNode;
  className?: string;
  /** `inline` sits inside a panel; `page` fills a screen section. */
  size?: 'inline' | 'page';
}

/**
 * An empty state says what this place is for and offers the single next
 * step — never a bare "No data".
 */
export function EmptyState({ icon, title, description, action, className, size = 'page' }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center animate-rise-in',
        size === 'page' ? 'py-16 sm:py-20' : 'py-10',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-background-elevated text-primary shadow-soft [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </div>
      )}
      <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-foreground-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
