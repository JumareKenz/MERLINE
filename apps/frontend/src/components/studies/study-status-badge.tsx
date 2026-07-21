import { StatusBadge } from '@/components/shared/status-badge';
import type { StudyStatus } from '@/types/study';

const STATUS_VARIANT_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  planned: 'default',
  in_design: 'info',
  design_review: 'warning',
  approved: 'success',
  pre_test: 'primary',
  data_collection: 'primary',
  data_cleaning: 'warning',
  analysis: 'info',
  reporting: 'info',
  completed: 'success',
  archived: 'warning',
};

export function StudyStatusBadge({ status }: { status: StudyStatus | string }) {
  return <StatusBadge status={status} variant={STATUS_VARIANT_MAP[status.toLowerCase()] || 'default'} />;
}
