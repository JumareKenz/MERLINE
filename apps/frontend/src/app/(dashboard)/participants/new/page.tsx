'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ParticipantForm, type ParticipantFormValues } from '@/components/participants/participant-form';
import { useCreateParticipant } from '@/hooks/use-participants';

export default function NewParticipantPage() {
  const router = useRouter();
  const createParticipant = useCreateParticipant();

  const handleSubmit = async (data: ParticipantFormValues) => {
    const result = await createParticipant.mutateAsync(data);
    const participant = result.data.data;
    router.push(`/participants/${participant.id}`);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="type-title">Add Participant</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-foreground-secondary">
          Record the participant before consent — consent is captured as a separate step once they&apos;ve been added.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="type-section">Participant Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ParticipantForm
            onSubmit={handleSubmit}
            isSubmitting={createParticipant.isPending}
            onCancel={() => router.push('/participants')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
