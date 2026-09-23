'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConsentList } from '@/components/participants/consent-list';
import { ConsentForm, type ConsentFormValues } from '@/components/participants/consent-form';
import { useParticipant } from '@/hooks/use-participants';
import { useConsentsForParticipant, useRecordConsent } from '@/hooks/use-consents';
import { useInterviews } from '@/hooks/use-interviews';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDate } from '@/lib/utils';
import { Mic, ShieldCheck } from 'lucide-react';

export default function ParticipantDetailPage() {
  const { participantId } = useParams<{ participantId: string }>();
  const [showConsentForm, setShowConsentForm] = useState(false);

  const { data: participantData, isLoading, isError, error, refetch } = useParticipant(participantId);
  const { data: consentsData } = useConsentsForParticipant(participantId);
  const { data: interviewsData } = useInterviews({ participantId });
  const recordConsent = useRecordConsent();
  const { can } = usePermissions();

  const participant = participantData?.data?.data;
  const consents = consentsData?.data?.data || [];
  const interviews = interviewsData?.data?.data || [];
  const hasUsableConsent = consents.some((c) => !c.withdrawnAt);

  const handleRecordConsent = async (data: ConsentFormValues) => {
    await recordConsent.mutateAsync({ ...data, participantId });
    setShowConsentForm(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (isError || !participant) {
    return <ErrorState message={error?.message || 'Participant not found'} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="type-title">{participant.displayName}</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-foreground-secondary">
            {participant.externalRef ? `Ref: ${participant.externalRef} · ` : ''}
            Added {formatDate(participant.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {can('create.consents') && (
            <Button variant="secondary" onClick={() => setShowConsentForm(true)}>
              <ShieldCheck className="h-4 w-4" aria-hidden /> Record consent
            </Button>
          )}
          {can('create.interviews') && (
            hasUsableConsent ? (
              <Button asChild>
                <Link href={`/interviews/new?participantId=${participantId}`}>
                  <Mic className="h-4 w-4" aria-hidden /> Start interview
                </Link>
              </Button>
            ) : (
              <Button disabled title="Record consent before starting an interview">
                <Mic className="h-4 w-4" aria-hidden /> Start interview
              </Button>
            )
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="type-section">Consent History</CardTitle>
        </CardHeader>
        <CardContent>
          <ConsentList consents={consents} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="type-section">Interviews ({interviews.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {interviews.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-foreground-secondary">
              No interviews yet.{hasUsableConsent ? '' : ' Record consent first — an interview cannot exist without it.'}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {interviews.map((interview) => (
                <Link
                  key={interview.id}
                  href={`/interviews/${interview.id}`}
                  className="flex items-center justify-between py-2.5 hover:bg-background-hover -mx-5 px-5 transition-colors"
                >
                  <div>
                    <p className="text-[13px] font-medium">
                      {interview.scheduledAt ? formatDate(interview.scheduledAt) : 'Unscheduled'}
                    </p>
                    {interview.location && (
                      <p className="text-[13px] text-foreground-tertiary">{interview.location}</p>
                    )}
                  </div>
                  <StatusBadge status={interview.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showConsentForm} onOpenChange={setShowConsentForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record consent</DialogTitle>
          </DialogHeader>
          <ConsentForm
            onSubmit={handleRecordConsent}
            isSubmitting={recordConsent.isPending}
            onCancel={() => setShowConsentForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
