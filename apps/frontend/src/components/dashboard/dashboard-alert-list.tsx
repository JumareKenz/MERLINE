'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { Bell } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { DashboardAlert } from '@/types/dashboard';

interface DashboardAlertListProps {
  alerts?: DashboardAlert[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const severityVariant = {
  critical: 'error' as const,
  warning: 'warning' as const,
  info: 'info' as const,
};

export function DashboardAlertList({ alerts, isLoading, error, onRetry }: DashboardAlertListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Alerts</CardTitle></CardHeader>
        <CardContent>
          <ErrorState message={error.message} onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  if (!alerts?.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Alerts</CardTitle></CardHeader>
        <CardContent>
          <EmptyState icon={<Bell className="h-8 w-8" />} title="No alerts" description="All clear — no alerts at this time" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts ({alerts.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
            <Badge variant={severityVariant[alert.severity]} className="mt-0.5 shrink-0">
              {alert.severity}
            </Badge>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="text-xs text-foreground-secondary mt-0.5">{alert.message}</p>
              <p className="text-xs text-foreground-tertiary mt-1">{formatRelativeTime(alert.created_at)}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
