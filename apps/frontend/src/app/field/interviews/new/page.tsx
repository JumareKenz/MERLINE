'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErrorState } from '@/components/shared/error-state';
import { useParticipants } from '@/hooks/use-participants';
import { useConsentsForParticipant } from '@/hooks/use-consents';
import { useCreateInterview } from '@/hooks/use-interviews';

export default function FieldNewInterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [participantId, setParticipantId] = useState(searchParams.get('participantId') || '');

  const { data: participantsData } = useParticipants();
  const { data: consentsData } = useConsentsForParticipant(participantId);
  const createInterview = useCreateInterview();

  const participants = participantsData?.data?.data || [];
  const usableConsent = (consentsData?.data?.data || []).find((c) => !c.withdrawnAt);

  const handleStart = async () => {
    if (!participantId || !usableConsent) return;
    const result = await createInterview.mutateAsync({ participantId, consentId: usableConsent.id });
    router.push(`/field/interviews/${result.data.data.id}`);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Start Interview</h1>

      <div className="space-y-1.5">
        <Label className="text-[13px]">Participant</Label>
        <Select value={participantId} onValueChange={setParticipantId}>
          <SelectTrigger className="h-11 text-[13px]">
            <SelectValue placeholder="Select a participant" />
          </SelectTrigger>
          <SelectContent>
            {participants.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {participantId && !usableConsent && (
        <ErrorState message="No active consent on file. Record consent for this participant first." />
      )}

      <Button className="w-full h-11" disabled={!usableConsent} loading={createInterview.isPending} onClick={handleStart}>
        Start Interview
      </Button>
    </div>
  );
}
