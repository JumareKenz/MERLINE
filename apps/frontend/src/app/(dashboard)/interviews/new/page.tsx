'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErrorState } from '@/components/shared/error-state';
import { useParticipants } from '@/hooks/use-participants';
import { useConsentsForParticipant } from '@/hooks/use-consents';
import { useCreateInterview } from '@/hooks/use-interviews';
import { formatDate } from '@/lib/utils';

export default function NewInterviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [participantId, setParticipantId] = useState(searchParams.get('participantId') || '');
  const [consentId, setConsentId] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const { data: participantsData } = useParticipants();
  const { data: consentsData } = useConsentsForParticipant(participantId);
  const createInterview = useCreateInterview();

  const participants = participantsData?.data?.data || [];
  const consents = (consentsData?.data?.data || []).filter((c) => !c.withdrawnAt);

  const handleSubmit = async () => {
    if (!participantId || !consentId) return;
    const result = await createInterview.mutateAsync({
      participantId,
      consentId,
      location: location || undefined,
      notes: notes || undefined,
    });
    const interview = result.data.data;
    router.push(`/interviews/${interview.id}`);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Start Interview</h1>
        <p className="text-[13px] text-foreground-tertiary mt-0.5">
          Every interview is tied to one consent record on file for the participant.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-[13px]">Participant *</Label>
            <Select
              value={participantId}
              onValueChange={(value) => {
                setParticipantId(value);
                setConsentId('');
              }}
            >
              <SelectTrigger className="h-9 text-[13px]">
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

          {participantId && (
            <div className="space-y-1.5">
              <Label className="text-[13px]">Consent Record *</Label>
              {consents.length === 0 ? (
                <ErrorState message="No active consent on file for this participant. Record consent on their profile before starting an interview." />
              ) : (
                <Select value={consentId} onValueChange={setConsentId}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue placeholder="Select a consent record" />
                  </SelectTrigger>
                  <SelectContent>
                    {consents.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        Version {c.version} · granted {formatDate(c.grantedAt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-[13px]">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} className="h-9 text-[13px]" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-[13px]">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="text-[13px] resize-none" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              disabled={!participantId || !consentId}
              loading={createInterview.isPending}
              onClick={handleSubmit}
            >
              Start Interview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
