'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { BarChart3 } from 'lucide-react';

interface IndicatorRow {
  id: string;
  name: string;
  target: number;
  current: number;
  percentage: number;
  rag: string;
}

const ragVariant: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  on_track: 'success',
  at_risk: 'warning',
  off_track: 'error',
  no_data: 'default',
};

const ragColor: Record<string, string> = {
  on_track: 'bg-success',
  at_risk: 'bg-warning',
  off_track: 'bg-error',
  no_data: 'bg-neutral-300',
};

interface IndicatorBreakdownProps {
  indicators?: IndicatorRow[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function IndicatorBreakdown({ indicators, isLoading, error, onRetry }: IndicatorBreakdownProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Indicator Achievement</CardTitle></CardHeader>
        <CardContent><ErrorState message={error.message} onRetry={onRetry} /></CardContent>
      </Card>
    );
  }

  if (!indicators?.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Indicator Achievement</CardTitle></CardHeader>
        <CardContent>
          <EmptyState icon={<BarChart3 className="h-8 w-8" />} title="No indicators" description="No indicators linked to this study" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Indicator Achievement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {indicators.map((indicator) => (
          <div key={indicator.id}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-sm font-medium truncate">{indicator.name}</span>
                <Badge variant={ragVariant[indicator.rag]} size="sm">
                  {indicator.rag.replace(/_/g, ' ')}
                </Badge>
              </div>
              <span className="text-sm text-foreground-secondary shrink-0 ml-2">
                {indicator.current}/{indicator.target}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-200">
              <div
                className={`h-full rounded-full transition-all ${ragColor[indicator.rag]}`}
                style={{ width: `${Math.min(indicator.percentage, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
