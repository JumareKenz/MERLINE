import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Primary action(s), right-aligned on wide screens, below on phones. */
  actions?: ReactNode;
  /** Status badges or context next to the title. */
  meta?: ReactNode;
  eyebrow?: string;
  className?: string;
}

/** Every admin screen starts here: where am I, what is this for, what can I do. */
export function PageHeader({ title, description, actions, meta, eyebrow, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="type-eyebrow mb-2">{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="type-title truncate">{title}</h1>
          {meta}
        </div>
        {description && <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-foreground-secondary">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
