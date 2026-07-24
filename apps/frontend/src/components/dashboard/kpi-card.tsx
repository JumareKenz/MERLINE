import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

interface KpiCardProps {
  icon?: ReactNode;
  label: string;
  value: string | number;
  trend?: { direction: 'up' | 'down' | 'flat'; value: string };
  className?: string;
}

export function KpiCard({ icon, label, value, trend, className }: KpiCardProps) {
  return (
    <div className={cn('rounded-lg bg-background-elevated border border-border-subtle p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-[12px] text-foreground-tertiary font-medium uppercase tracking-[0.06em]">
            {label}
          </p>
          <p className="text-[26px] font-semibold tracking-tight text-foreground leading-none mt-2">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1 pt-1">
              {trend.direction === 'up' && <TrendingUp className="h-3 w-3 text-success" />}
              {trend.direction === 'down' && <TrendingDown className="h-3 w-3 text-error" />}
              {trend.direction === 'flat' && <Minus className="h-3 w-3 text-foreground-tertiary" />}
              <span
                className={cn(
                  'text-[11px]',
                  trend.direction === 'up' && 'text-success',
                  trend.direction === 'down' && 'text-error',
                  trend.direction === 'flat' && 'text-foreground-tertiary'
                )}
              >
                {trend.value}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary dark:bg-primary-100/10 dark:text-primary-400">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-lg bg-background-elevated border border-border-subtle p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-2.5 w-20 animate-skeleton-pulse rounded bg-neutral-200/50 dark:bg-neutral-700/50" />
          <div className="h-7 w-14 animate-skeleton-pulse rounded bg-neutral-200/50 dark:bg-neutral-700/50" />
          <div className="h-2.5 w-24 animate-skeleton-pulse rounded bg-neutral-200/50 dark:bg-neutral-700/50" />
        </div>
        <div className="h-8 w-8 animate-skeleton-pulse rounded-md bg-neutral-200/50 dark:bg-neutral-700/50" />
      </div>
    </div>
  );
}
