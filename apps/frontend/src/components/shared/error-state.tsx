import { AlertTriangle, Lock, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  /** Picks wording and icon. Inferred from `status` when omitted. */
  kind?: 'error' | 'offline' | 'forbidden' | 'not-found';
  status?: number;
}

const COPY = {
  error: { title: 'Something went wrong', icon: AlertTriangle },
  offline: { title: "You're offline", icon: WifiOff },
  forbidden: { title: "You don't have access to this", icon: Lock },
  'not-found': { title: 'Not found', icon: AlertTriangle },
} as const;

function inferKind(status?: number): ErrorStateProps['kind'] {
  if (status === 0) return 'offline';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  return 'error';
}

/**
 * Human wording only. The API's own message is shown because the backend
 * writes it for people ("Consent does not permit recording…"); stack
 * traces never reach this component.
 */
export function ErrorState({ title, message, onRetry, className, kind, status }: ErrorStateProps) {
  const resolved = kind ?? inferKind(status);
  const { title: defaultTitle, icon: Icon } = COPY[resolved ?? 'error'];
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-error-bg text-error">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="text-[16px] font-semibold text-foreground">{title ?? defaultTitle}</h3>
      {message && <p className="mt-1.5 max-w-sm text-[14px] leading-relaxed text-foreground-secondary">{message}</p>}
      {onRetry && resolved !== 'forbidden' && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
