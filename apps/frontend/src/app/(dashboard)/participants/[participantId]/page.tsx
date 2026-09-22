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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">{participant.displayName}</h1>
          <p className="text-[13px] text-foreground-tertiary mt-0.5">
            {participant.externalRef ? `Ref: ${participant.externalRef} · ` : ''}
            Added {formatDate(participant.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {can('create.consents') && (
            <Button size="sm" variant="outline" className="h-8 px-3 text-[13px]" onClick={() => setShowConsentForm(true)}>
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Record Consent
            </Button>
          )}
          {can('create.interviews') && (
            <Link href={hasUsableConsent ? `/interviews/new?participantId=${participantId}` : '#'}>
              <Button
                size="sm"
                className="h-8 px-3 text-[13px]"
                disabled={!hasUsableConsent}
                title={hasUsableConsent ? undefined : 'Record consent before starting an interview'}
              >
                <Mic className="h-3.5 w-3.5 mr-1.5" /> Start Interview
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Consent History</CardTitle>
        </CardHeader>
        <CardContent>
          <ConsentList consents={consents} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Interviews ({interviews.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {interviews.length === 0 ? (
            <p className="text-[13px] text-foreground-tertiary py-6 text-center">No interviews yet.</p>
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
                      <p className="text-[12px] text-foreground-tertiary">{interview.location}</p>
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
            <DialogTitle>Record Consent</DialogTitle>
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
