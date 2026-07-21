'use client';

import { useSyncStatus, useSyncLog, useFullSync } from '@/hooks/use-sync';
import { SyncMonitor } from '@/components/data-collection/sync-monitor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { SyncStatusIndicator } from '@/components/data-collection/sync-status-indicator';
import { formatDateTime } from '@/lib/utils';
import { RefreshCw, History } from 'lucide-react';
import type { SyncLogEntry } from '@/types/media';

export default function SyncMonitorPage() {
  const { data: statusData, isLoading: statusLoading, isError: statusError, error: statusErr, refetch: refetchStatus } = useSyncStatus();
  const { data: logData, isLoading: logLoading, refetch: refetchLog } = useSyncLog();
  const fullSyncMutation = useFullSync();

  const devices = statusData?.data?.data || [];
  const logEntries = (logData?.data?.data || []) as SyncLogEntry[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sync Monitor</h1>
          <p className="text-foreground-secondary mt-1">
            Monitor device synchronization and data flow.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => { refetchStatus(); refetchLog(); }}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => fullSyncMutation.mutate()} disabled={fullSyncMutation.isPending}>
            {fullSyncMutation.isPending ? 'Syncing...' : 'Full Sync'}
          </Button>
        </div>
      </div>

      {statusLoading ? (
        <div className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : statusError ? (
        <ErrorState message={statusErr?.message} onRetry={() => refetchStatus()} />
      ) : (
        <SyncMonitor
          devices={devices}
          isLoading={statusLoading}
          isError={statusError}
          error={statusErr}
          onRetry={() => refetchStatus()}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Sync History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : logEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <History className="h-8 w-8 text-foreground-tertiary mb-2" />
              <p className="text-sm text-foreground-secondary">No sync history available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logEntries.slice(0, 20).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-md bg-background-surface p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <SyncStatusIndicator
                      status={entry.status === 'success' ? 'synced' : 'error'}
                    />
                    <span className="font-mono text-xs">{entry.device_id.slice(0, 12)}...</span>
                    <span className="text-foreground-secondary">{entry.action}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-foreground-secondary">
                    <span className="tabular-nums">{entry.records_synced} records</span>
                    <span>{formatDateTime(entry.started_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
