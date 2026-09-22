'use client';

import { useState } from 'react';
import { Check, X, ShieldOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { CONSENT_SCOPES, type Consent } from '@/types/consent';
import { formatDate } from '@/lib/utils';
import { useWithdrawConsent } from '@/hooks/use-consents';
import { usePermissions } from '@/hooks/use-permissions';

export function ConsentList({ consents }: { consents: Consent[] }) {
  const [withdrawTarget, setWithdrawTarget] = useState<Consent | null>(null);
  const withdrawConsent = useWithdrawConsent();
  const { can } = usePermissions();

  if (consents.length === 0) {
    return <p className="text-[13px] text-foreground-tertiary py-6 text-center">No consent on file yet.</p>;
  }

  return (
    <div className="space-y-3">
      {consents.map((consent) => (
        <Card key={consent.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium">Version {consent.version}</span>
                  <Badge variant="default" size="sm">{consent.method}</Badge>
                  {consent.withdrawnAt ? (
                    <Badge variant="error" size="sm">Withdrawn</Badge>
                  ) : (
                    <Badge variant="success" size="sm">Active</Badge>
                  )}
                </div>
                <p className="text-[12px] text-foreground-tertiary mt-0.5">
                  Granted {formatDate(consent.grantedAt)}
                  {consent.withdrawnAt && ` · Withdrawn ${formatDate(consent.withdrawnAt)}`}
                </p>
              </div>
              {!consent.withdrawnAt && can('withdraw.consents') && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[12px] text-error hover:text-error"
                  onClick={() => setWithdrawTarget(consent)}
                >
                  <ShieldOff className="h-3.5 w-3.5 mr-1" /> Withdraw
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CONSENT_SCOPES.map((scope) => {
                const allowed = Boolean(consent[scope.key]);
                return (
                  <div
                    key={scope.key}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] ${
                      allowed ? 'bg-success-bg text-success' : 'bg-neutral-100 text-foreground-tertiary dark:bg-neutral-800'
                    }`}
                  >
                    {allowed ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                    {scope.label}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <ConfirmDialog
        open={!!withdrawTarget}
        onOpenChange={(open) => !open && setWithdrawTarget(null)}
        title="Withdraw Consent"
        description="This blocks all future recording, transcription, AI analysis, quotation and publication under this consent record. It does not delete anything already created — that follows the retention policy separately."
        variant="danger"
        confirmLabel="Withdraw Consent"
        loading={withdrawConsent.isPending}
        onConfirm={async () => {
          if (!withdrawTarget) return;
          await withdrawConsent.mutateAsync(withdrawTarget.id);
          setWithdrawTarget(null);
        }}
      />
    </div>
  );
}
