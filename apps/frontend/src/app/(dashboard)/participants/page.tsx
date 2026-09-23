'use client';

import Link from 'next/link';
import { ParticipantTable } from '@/components/participants/participant-table';
import { useParticipants } from '@/hooks/use-participants';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';

export default function ParticipantsPage() {
  const { data, isLoading, isError, error, refetch } = useParticipants();
  const { can } = usePermissions();

  const participants = data?.data?.data || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="type-title">Participants</h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-foreground-secondary">
            People consented to be interviewed. Consent and interviews are recorded per participant.
          </p>
        </div>
        {can('create.participants') && (
          <Button asChild>
            <Link href="/participants/new">
              <Plus className="h-4 w-4" aria-hidden /> Add participant
            </Link>
          </Button>
        )}
      </div>

      <ParticipantTable
        data={participants}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
      />
    </div>
  );
}
