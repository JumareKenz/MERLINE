'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { Users } from 'lucide-react';

interface EnumeratorRow {
  id: string;
  name: string;
  submissions: number;
  approval_rate: number;
  quality_score: number;
}

interface DataCollectionProgressProps {
  enumerators?: EnumeratorRow[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function DataCollectionProgress({ enumerators, isLoading, error, onRetry }: DataCollectionProgressProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-2 w-full" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Enumerator Progress</CardTitle></CardHeader>
        <CardContent><ErrorState message={error.message} onRetry={onRetry} /></CardContent>
      </Card>
    );
  }

  if (!enumerators?.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Enumerator Progress</CardTitle></CardHeader>
        <CardContent>
          <EmptyState icon={<Users className="h-8 w-8" />} title="No enumerators" description="No enumerators assigned yet" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enumerator Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {enumerators.map((enumerator) => (
          <div key={enumerator.id}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{enumerator.name}</span>
                <Badge variant={enumerator.quality_score >= 80 ? 'success' : enumerator.quality_score >= 50 ? 'warning' : 'error'} size="sm">
                  {enumerator.quality_score}%
                </Badge>
              </div>
              <span className="text-sm text-foreground-secondary">{enumerator.submissions} submissions</span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${enumerator.approval_rate}%` }}
              />
            </div>
            <p className="text-xs text-foreground-tertiary mt-0.5">
              {enumerator.approval_rate}% approval rate
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
