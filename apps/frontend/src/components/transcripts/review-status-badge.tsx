import { AlertTriangle, CheckCircle2, Clock3, Loader2, Lock, PencilLine, Send, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { REVIEW_STATUS_LABELS, type ReviewStatus } from '@/types/review';

const LOOK: Record<ReviewStatus, { variant: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'accent'; icon: typeof Clock3 }> = {
  RECORDING_SUBMITTED: { variant: 'default', icon: Clock3 },
  TRANSCRIPTION_PROCESSING: { variant: 'info', icon: Loader2 },
  AVAILABLE_FOR_REVIEW: { variant: 'accent', icon: PencilLine },
  ENUMERATOR_EDITING: { variant: 'accent', icon: PencilLine },
  SUBMITTED_FOR_ADMIN_REVIEW: { variant: 'warning', icon: Send },
  RETURNED_FOR_CORRECTION: { variant: 'error', icon: Undo2 },
  APPROVED: { variant: 'success', icon: CheckCircle2 },
  LOCKED: { variant: 'primary', icon: Lock },
};

/** Icon and words, never colour alone. */
export function ReviewStatusBadge({ status, size }: { status: ReviewStatus | undefined; size?: 'sm' | 'default' }) {
  if (!status) return null;
  const look = LOOK[status] ?? { variant: 'default' as const, icon: AlertTriangle };
  const Icon = look.icon;
  return (
    <Badge variant={look.variant} size={size}>
      <Icon className={status === 'TRANSCRIPTION_PROCESSING' ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} aria-hidden strokeWidth={2.25} />
      {REVIEW_STATUS_LABELS[status]}
    </Badge>
  );
}
