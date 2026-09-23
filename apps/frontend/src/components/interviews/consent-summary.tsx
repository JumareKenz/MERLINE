import { Check, Minus, ShieldAlert } from 'lucide-react';
import { CONSENT_SCOPES, type Consent } from '@/types/consent';
import { cn, formatDate } from '@/lib/utils';

/**
 * What the participant agreed to, scope by scope. Each row carries a word
 * ("Allowed" / "Not allowed"), not just an icon or color.
 */
export function ConsentSummary({ consent, className }: { consent: Consent; className?: string }) {
  const withdrawn = !!consent.withdrawnAt;
  const expired = !!consent.expiresAt && Date.parse(consent.expiresAt) < Date.now();

  return (
    <div className={cn('space-y-3', className)}>
      {(withdrawn || expired) && (
        <p className="flex items-start gap-2 rounded-lg bg-error-bg px-3 py-2.5 text-[13px] text-foreground-error">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {withdrawn
            ? `Withdrawn ${formatDate(consent.withdrawnAt as string)}. No further recording or processing is permitted.`
            : `Expired ${formatDate(consent.expiresAt as string)}.`}
        </p>
      )}
      <ul className="divide-y divide-border-subtle">
        {CONSENT_SCOPES.map((scope) => {
          const allowed = !!consent[scope.key] && !withdrawn && !expired;
          return (
            <li key={scope.key} className="flex items-center justify-between gap-3 py-2 text-[14px]">
              <span className="text-foreground">{scope.label}</span>
              <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium', allowed ? 'text-success' : 'text-foreground-tertiary')}>
                {allowed ? <Check className="h-4 w-4" aria-hidden /> : <Minus className="h-4 w-4" aria-hidden />}
                {allowed ? 'Allowed' : 'Not allowed'}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-[13px] text-foreground-tertiary">
        {consent.method.charAt(0) + consent.method.slice(1).toLowerCase()} consent · version {consent.version} · recorded {formatDate(consent.grantedAt)}
      </p>
    </div>
  );
}
