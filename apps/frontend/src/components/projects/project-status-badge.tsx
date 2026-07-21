import { StatusBadge } from '@/components/shared/status-badge';

const PROJECT_STATUS_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  active: 'success',
  completed: 'info',
  archived: 'warning',
};

export function ProjectStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} variant={PROJECT_STATUS_MAP[status.toLowerCase()] || 'default'} />;
}
