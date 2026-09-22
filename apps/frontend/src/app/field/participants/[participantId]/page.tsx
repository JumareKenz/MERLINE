'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShieldCheck, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { ConsentList } from '@/components/participants/consent-list';
import { ConsentForm, type ConsentFormValues } from '@/components/participants/consent-form';
import { useParticipant } from '@/hooks/use-participants';
import { useConsentsForParticipant, useRecordConsent } from '@/hooks/use-consents';
import { useCreateInterview } from '@/hooks/use-interviews';

export default function FieldParticipantDetailPage() {
  const { participantId } = useParams<{ participantId: string }>();
  const router = useRouter();
  const [showConsentForm, setShowConsentForm] = useState(false);

  const { data: participantData, isLoading, isError, error, refetch } = useParticipant(participantId);
  const { data: consentsData } = useConsentsForParticipant(participantId);
  const recordConsent = useRecordConsent();
  const createInterview = useCreateInterview();

  const participant = participantData?.data?.data;
  const consents = consentsData?.data?.data || [];
  const usableConsent = consents.find((c) => !c.withdrawnAt);

  const handleRecordConsent = async (data: ConsentFormValues) => {
    await recordConsent.mutateAsync({ ...data, participantId });
    setShowConsentForm(false);
  };

  const handleStartInterview = async () => {
    if (!usableConsent) return;
    const result = await createInterview.mutateAsync({ participantId, consentId: usableConsent.id });
    router.push(`/field/interviews/${result.data.data.id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (isError || !participant) {
    return <ErrorState message={error?.message || 'Participant not found'} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-[17px] font-semibold tracking-tight text-foreground">{participant.displayName}</h1>

      <div className="grid grid-cols-1 gap-2">
        <Button variant="outline" className="h-11 justify-start text-[13px]" onClick={() => setShowConsentForm(true)}>
          <ShieldCheck className="h-4 w-4 mr-2" /> Record Consent
        </Button>
        <Button
          className="h-11 justify-start text-[13px]"
          disabled={!usableConsent}
          loading={createInterview.isPending}
          onClick={handleStartInterview}
        >
          <Mic className="h-4 w-4 mr-2" />
          {usableConsent ? 'Start Interview' : 'Record consent to start interview'}
        </Button>
      </div>

      <div>
        <p className="text-[12px] font-medium text-foreground-tertiary uppercase tracking-wide mb-2">Consent</p>
        <ConsentList consents={consents} />
      </div>

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
