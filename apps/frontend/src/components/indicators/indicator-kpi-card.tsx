'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { Indicator } from '@/types/indicator';

const ragVariants = cva('h-2 rounded-full', {
  variants: {
    status: {
      on_track: 'bg-success',
      at_risk: 'bg-warning',
      off_track: 'bg-error',
      no_data: 'bg-neutral-300',
    },
  },
  defaultVariants: { status: 'no_data' },
});

interface IndicatorKpiCardProps {
  indicator?: Indicator;
  isLoading?: boolean;
}

export function IndicatorKpiCard({ indicator, isLoading }: IndicatorKpiCardProps) {
  if (isLoading) {
    return (
      <Card><CardContent className="p-4 space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-16" /><Skeleton className="h-2 w-full" /></CardContent></Card>
    );
  }

  if (!indicator) return null;

  const current = indicator.current_value;
  const target = indicator.target_value;
  const percentage = target && current ? Math.round((current / target) * 100) : 0;

  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-2">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-foreground-secondary truncate">{indicator.code}</p>
          <span className="text-xs capitalize text-foreground-secondary">{indicator.data_type}</span>
        </div>
        <p className="text-sm font-medium truncate mb-3">{indicator.name}</p>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-semibold">{current ?? '-'}</span>
          {target !== undefined && target !== null && (
            <span className="text-xs text-foreground-secondary">/ {target}</span>
          )}
        </div>
        <div className="w-full bg-neutral-100 rounded-full h-2">
          <div className={cn(ragVariants({ status: indicator.rag_status || 'no_data' }))} style={{ width: `${Math.min(percentage, 100)}%` }} />
        </div>
        {percentage > 0 && (
          <p className="text-[10px] text-foreground-secondary mt-1">{percentage}% of target</p>
        )}
      </CardContent>
    </Card>
  );
}
