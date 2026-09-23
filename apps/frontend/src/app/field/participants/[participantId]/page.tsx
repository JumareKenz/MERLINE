'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Mic, ShieldCheck, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { FieldConsentForm } from '@/components/field/field-consent-form';
import { useConsentsForParticipant, useRecordConsent } from '@/hooks/use-consents';
import { useCreateInterview } from '@/hooks/use-interviews';
import { useParticipant } from '@/hooks/use-participants';
import { useFieldOutbox } from '@/stores/field-outbox-store';
import { CONSENT_SCOPES } from '@/types/consent';
import { formatDate } from '@/lib/utils';

export default function FieldParticipantPage() {
  const { participantId } = useParams<{ participantId: string }>();
  const router = useRouter();
  const startWithConsent = useSearchParams().get('consent') === '1';
  const online = useFieldOutbox((s) => s.online);
  const { data, isLoading, isError, error, refetch } = useParticipant(participantId);
  const { data: consentsData, isLoading: consentsLoading } = useConsentsForParticipant(participantId);
  const recordConsent = useRecordConsent();
  const createInterview = useCreateInterview();
  const [capturing, setCapturing] = useState(startWithConsent);

  const participant = data?.data?.data;
  const consents = consentsData?.data?.data ?? [];
  const active = consents.find((c) => !c.withdrawnAt);

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (isError || !participant) {
    const e = error as { message?: string; status?: number } | null;
    return <ErrorState message={e?.message ?? 'This person could not be found.'} status={online ? e?.status : 0} onRetry={() => refetch()} />;
  }

  if (capturing && !(startWithConsent && active)) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-[15px] font-medium text-foreground-secondary">{participant.displayName}</p>
          <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground">Record consent</h1>
        </div>
        <FieldConsentForm
          isSubmitting={recordConsent.isPending}
          onCancel={() => setCapturing(false)}
          onSubmit={async (values) => {
            const ok = await recordConsent
              .mutateAsync({ ...values, participantId })
              .then(() => true)
              .catch(() => false);
            if (ok) {
              setCapturing(false);
              router.replace(`/field/participants/${participantId}`);
            }
          }}
        />
      </div>
    );
  }

  const startInterview = async () => {
    if (!active) return;
    const result = await createInterview.mutateAsync({ participantId, consentId: active.id }).catch(() => null);
    if (result) router.push(`/field/interview?id=${result.data.data.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/field/participants" className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-[15px] font-medium text-foreground-secondary">
          <ArrowLeft className="h-5 w-5" aria-hidden /> People
        </Link>
        <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground">{participant.displayName}</h1>
        <p className="mt-1 text-[15px] text-foreground-secondary">
          {participant.externalRef ? `${participant.externalRef} · ` : ''}Registered {formatDate(participant.createdAt)}
        </p>
      </div>

      {consentsLoading ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : active ? (
        <section className="rounded-2xl bg-field-card p-4 ring-1 ring-field-line">
          <p className="flex items-center gap-2 text-[16px] font-semibold text-foreground">
            <ShieldCheck className="h-5 w-5 text-success" aria-hidden /> Consent on file
          </p>
          <p className="mt-0.5 text-[14px] text-foreground-secondary">
            {active.method.charAt(0) + active.method.slice(1).toLowerCase()} · {active.version} · {formatDate(active.grantedAt)}
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-1.5">
            {CONSENT_SCOPES.map((s) => (
              <li key={s.key} className="flex items-center justify-between text-[15px]">
                <span className="text-foreground">{s.label}</span>
                <span className={active[s.key] ? 'font-semibold text-success' : 'text-foreground-tertiary'}>{active[s.key] ? 'Yes' : 'No'}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="rounded-2xl bg-warning-bg p-4">
          <p className="flex items-center gap-2 text-[16px] font-semibold text-foreground">
            <ShieldOff className="h-5 w-5 text-warning" aria-hidden /> No consent yet
          </p>
          <p className="mt-1 text-[15px] text-foreground-secondary">An interview can’t be started or recorded until consent is recorded.</p>
        </section>
      )}

      <div className="space-y-2">
        {active ? (
          <Button size="xl" className="w-full" onClick={startInterview} loading={createInterview.isPending} disabled={!online}>
            <Mic className="h-5 w-5" aria-hidden /> Start an interview
          </Button>
        ) : (
          <Button size="xl" className="w-full" onClick={() => setCapturing(true)} disabled={!online}>
            <ShieldCheck className="h-5 w-5" aria-hidden /> Record consent
          </Button>
        )}
        {!online && <p className="text-center text-[14px] text-foreground-secondary">Needs a connection. Assigned interviews can be recorded offline from Today.</p>}
      </div>
    </div>
  );
}
