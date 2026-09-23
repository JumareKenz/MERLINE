import { AlertTriangle, CheckCircle2, CircleDashed, CircleDot, Clock3, Loader2, XCircle, Archive, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Variant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'accent';

interface StatusBadgeProps {
  status: string;
  variant?: Variant;
  /** Override the displayed text (e.g. "Awaiting review"). */
  label?: string;
  size?: 'sm' | 'default';
}

/**
 * Every status has a label and an icon, so it never depends on color alone.
 * Covers the live qualitative workflow: interviews, transcripts, findings,
 * plus generic project/user states.
 */
const STATUS: Record<string, { variant: Variant; label?: string; icon: typeof CircleDot }> = {
  scheduled: { variant: 'info', icon: Clock3 },
  in_progress: { variant: 'accent', label: 'In progress', icon: CircleDot },
  completed: { variant: 'success', icon: CheckCircle2 },
  cancelled: { variant: 'default', icon: XCircle },
  pending: { variant: 'warning', icon: Clock3 },
  processing: { variant: 'info', icon: Loader2 },
  failed: { variant: 'error', icon: AlertTriangle },
  draft: { variant: 'default', icon: CircleDashed },
  in_review: { variant: 'warning', label: 'In review', icon: Clock3 },
  approved: { variant: 'success', icon: CheckCircle2 },
  rejected: { variant: 'error', icon: XCircle },
  published: { variant: 'primary', icon: Send },
  archived: { variant: 'default', icon: Archive },
  active: { variant: 'success', icon: CircleDot },
  inactive: { variant: 'default', icon: CircleDashed },
  suspended: { variant: 'error', icon: XCircle },
  invited: { variant: 'info', icon: Send },
};

function formatStatus(status: string): string {
  const s = status.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function StatusBadge({ status, variant, label, size = 'default' }: StatusBadgeProps) {
  const entry = STATUS[status.toLowerCase()];
  const Icon = entry?.icon ?? CircleDot;
  return (
    <Badge variant={variant ?? entry?.variant ?? 'default'} size={size}>
      <Icon className="h-3 w-3" aria-hidden strokeWidth={2.25} />
      {label ?? entry?.label ?? formatStatus(status)}
    </Badge>
  );
}
