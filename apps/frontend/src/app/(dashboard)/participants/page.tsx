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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Participants</h1>
          <p className="text-[13px] text-foreground-tertiary mt-0.5">
            People consented to be interviewed. Consent and interviews are recorded per participant.
          </p>
        </div>
        {can('create.participants') && (
          <Link href="/participants/new">
            <Button size="sm" className="h-8 px-3 text-[13px]">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Participant
            </Button>
          </Link>
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
