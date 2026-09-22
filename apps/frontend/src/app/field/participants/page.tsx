'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useParticipants } from '@/hooks/use-participants';
import { formatDate } from '@/lib/utils';

export default function FieldParticipantsPage() {
  const { data, isLoading, isError, error, refetch } = useParticipants();
  const participants = data?.data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Participants</h1>
        <Link href="/field/participants/new">
          <Button size="sm" className="h-8 px-3 text-[13px]">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : isError ? (
        <ErrorState message={error?.message} onRetry={() => refetch()} />
      ) : participants.length === 0 ? (
        <EmptyState title="No participants yet" description="Add your first participant to get started." />
      ) : (
        <div className="space-y-2">
          {participants.map((p) => (
            <Link
              key={p.id}
              href={`/field/participants/${p.id}`}
              className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-background-hover transition-colors"
            >
              <div>
                <p className="text-[13px] font-medium">{p.displayName}</p>
                <p className="text-[12px] text-foreground-tertiary">Added {formatDate(p.createdAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
