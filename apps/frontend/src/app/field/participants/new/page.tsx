'use client';

import { useRouter } from 'next/navigation';
import { ParticipantForm, type ParticipantFormValues } from '@/components/participants/participant-form';
import { useCreateParticipant } from '@/hooks/use-participants';

export default function FieldNewParticipantPage() {
  const router = useRouter();
  const createParticipant = useCreateParticipant();

  const handleSubmit = async (data: ParticipantFormValues) => {
    const result = await createParticipant.mutateAsync(data);
    router.push(`/field/participants/${result.data.data.id}`);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Add Participant</h1>
      <ParticipantForm
        onSubmit={handleSubmit}
        isSubmitting={createParticipant.isPending}
        onCancel={() => router.push('/field/participants')}
      />
    </div>
  );
}
