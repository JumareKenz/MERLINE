'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface IndicatorValueChartProps {
  values?: { period: string; value: number }[];
  targetValue?: number;
  isLoading?: boolean;
}

export function IndicatorValueChart({ values, targetValue, isLoading }: IndicatorValueChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Value Trend</CardTitle></CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!values?.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">Value Trend</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-sm text-foreground-secondary">
            No values recorded yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxVal = Math.max(...values.map((v) => v.value), targetValue || 0);
  const chartHeight = 200;
  const barWidth = Math.max(20, Math.min(60, (600 / values.length) - 4));

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Value Trend</CardTitle></CardHeader>
      <CardContent>
        <div className="relative" style={{ height: chartHeight }}>
          {targetValue !== undefined && (
            <div
              className="absolute left-0 right-0 border-t-2 border-dashed border-warning z-10"
              style={{ bottom: `${(targetValue / (maxVal * 1.2)) * chartHeight}px` }}
            >
              <span className="absolute -top-4 right-0 text-[10px] text-warning">Target: {targetValue}</span>
            </div>
          )}
          <div className="flex items-end justify-around h-full gap-1">
            {values.map((v, i) => {
              const h = (v.value / (maxVal * 1.2)) * chartHeight;
              return (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div
                    className="w-full bg-primary rounded-t transition-all duration-300 hover:bg-primary-600"
                    style={{ height: `${Math.max(h, 4)}px`, maxWidth: barWidth }}
                    title={`${v.period}: ${v.value}`}
                  />
                  <span className="text-[10px] text-foreground-secondary mt-1 truncate w-full text-center">
                    {v.period.slice(-2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
