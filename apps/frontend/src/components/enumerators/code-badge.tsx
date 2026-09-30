import { CheckCircle2, CircleDashed, KeyRound, Timer, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ACCESS_CODE_LABELS, type AccessCodeState } from '@/types/enumerator';

const LOOK: Record<AccessCodeState, { variant: 'default' | 'success' | 'warning' | 'error' | 'info'; icon: typeof KeyRound }> = {
  NONE: { variant: 'default', icon: CircleDashed },
  UNUSED: { variant: 'info', icon: KeyRound },
  ACTIVE: { variant: 'success', icon: CheckCircle2 },
  EXPIRED: { variant: 'warning', icon: Timer },
  REVOKED: { variant: 'error', icon: XCircle },
};

export function CodeBadge({ state, legacy }: { state: AccessCodeState; legacy?: boolean }) {
  const look = LOOK[state];
  const Icon = look.icon;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge variant={look.variant}>
        <Icon className="h-3 w-3" aria-hidden strokeWidth={2.25} />
        {ACCESS_CODE_LABELS[state]}
      </Badge>
      {legacy && <Badge variant="warning">Shared code</Badge>}
    </span>
  );
}
