import { StatusBadge } from '@/components/shared/status-badge';

const STATUS_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  under_review: 'warning',
  approved: 'success',
  superseded: 'info',
};

export function IndicatorStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} variant={STATUS_MAP[status.toLowerCase()] || 'default'} />;
}
