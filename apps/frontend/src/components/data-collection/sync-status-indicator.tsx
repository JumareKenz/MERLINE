'use client';

import { cn } from '@/lib/utils';

type SyncState = 'synced' | 'syncing' | 'pending' | 'error' | 'offline' | 'online';

interface SyncStatusIndicatorProps {
  status: SyncState;
  label?: string;
  className?: string;
}

const STATUS_CONFIG: Record<SyncState, { color: string; bg: string; defaultLabel: string }> = {
  synced: { color: 'bg-success', bg: 'bg-success-bg', defaultLabel: 'Synced' },
  syncing: { color: 'bg-warning', bg: 'bg-warning-bg', defaultLabel: 'Syncing...' },
  pending: { color: 'bg-warning', bg: 'bg-warning-bg', defaultLabel: 'Pending' },
  online: { color: 'bg-success', bg: 'bg-success-bg', defaultLabel: 'Online' },
  error: { color: 'bg-error', bg: 'bg-error-bg', defaultLabel: 'Error' },
  offline: { color: 'bg-neutral-300', bg: 'bg-neutral-100', defaultLabel: 'Offline' },
};

export function SyncStatusIndicator({ status, label, className }: SyncStatusIndicatorProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('h-2 w-2 rounded-full', config.color)} />
      <span className="text-xs font-medium">{label || config.defaultLabel}</span>
    </div>
  );
}
