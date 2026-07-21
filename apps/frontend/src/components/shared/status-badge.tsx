import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
}

const STATUS_VARIANT_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  active: 'success',
  inactive: 'default',
  suspended: 'error',
  draft: 'default',
  submitted: 'info',
  approved: 'success',
  rejected: 'error',
  archived: 'warning',
  completed: 'success',
  pre_test: 'primary',
  field: 'primary',
  data_cleaning: 'warning',
  analysis: 'info',
  published: 'success',
  pending: 'warning',
  invited: 'info',
};

function getStatusVariant(status: string): 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' {
  return STATUS_VARIANT_MAP[status.toLowerCase()] || 'default';
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  return (
    <Badge variant={variant || getStatusVariant(status)}>
      {formatStatus(status)}
    </Badge>
  );
}
