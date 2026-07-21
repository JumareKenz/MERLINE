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
    <div className={cn('rounded-lg bg-background-elevated p-5 shadow-1', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-foreground-secondary">{label}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              {trend.direction === 'up' && <TrendingUp className="h-3 w-3 text-success" />}
              {trend.direction === 'down' && <TrendingDown className="h-3 w-3 text-error" />}
              {trend.direction === 'flat' && <Minus className="h-3 w-3 text-foreground-tertiary" />}
              <span
                className={cn(
                  'font-medium',
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-lg bg-background-elevated p-5 shadow-1">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 animate-skeleton-pulse rounded bg-neutral-200/50" />
          <div className="h-8 w-16 animate-skeleton-pulse rounded bg-neutral-200/50" />
          <div className="h-3 w-24 animate-skeleton-pulse rounded bg-neutral-200/50" />
        </div>
        <div className="h-10 w-10 animate-skeleton-pulse rounded-lg bg-neutral-200/50" />
      </div>
    </div>
  );
}
