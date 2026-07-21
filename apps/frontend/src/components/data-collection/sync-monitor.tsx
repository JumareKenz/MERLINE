'use client';

import { SyncStatusIndicator } from './sync-status-indicator';
import { formatRelativeTime } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/shared/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import type { SyncStatusData } from '@/types/media';

const COLUMNS: ColumnDef<SyncStatusData>[] = [
  {
    accessorKey: 'device_id',
    header: 'Device',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.device_id.slice(0, 12)}...</span>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <SyncStatusIndicator status={row.original.status} />,
  },
  {
    accessorKey: 'last_synced_at',
    header: 'Last Sync',
    cell: ({ row }) =>
      row.original.last_synced_at ? (
        <span className="text-sm">{formatRelativeTime(row.original.last_synced_at)}</span>
      ) : (
        <span className="text-foreground-tertiary">Never</span>
      ),
  },
  {
    accessorKey: 'pending_upload',
    header: 'Pending Upload',
    cell: ({ row }) => <span className="tabular-nums">{row.original.pending_upload}</span>,
  },
  {
    accessorKey: 'pending_download',
    header: 'Pending Download',
    cell: ({ row }) => <span className="tabular-nums">{row.original.pending_download}</span>,
  },
  {
    accessorKey: 'errors',
    header: 'Errors',
    cell: ({ row }) => {
      const count = row.original.errors;
      if (!count) return <span className="text-foreground-tertiary">0</span>;
      return <span className="text-error tabular-nums font-medium">{count}</span>;
    },
  },
];

interface SyncMonitorProps {
  devices: SyncStatusData[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function SyncMonitor({ devices, isLoading, isError, error, onRetry }: SyncMonitorProps) {
  const summary = {
    total: devices.length,
    online: devices.filter((d) => d.status === 'online').length,
    offline: devices.filter((d) => d.status === 'offline').length,
    errors: devices.filter((d) => d.status === 'error').length,
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{summary.total}</p>
            <p className="text-xs text-foreground-secondary">Total Devices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">{summary.online}</p>
            <p className="text-xs text-foreground-secondary">Online</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground-tertiary">{summary.offline}</p>
            <p className="text-xs text-foreground-secondary">Offline</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-error">{summary.errors}</p>
            <p className="text-xs text-foreground-secondary">Errors</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={COLUMNS}
        data={devices}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={onRetry}
        emptyTitle="No devices registered"
        emptyDescription="Devices will appear here once they sync."
      />
    </div>
  );
}
