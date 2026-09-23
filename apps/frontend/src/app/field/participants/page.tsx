'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { useParticipants } from '@/hooks/use-participants';
import { useFieldOutbox } from '@/stores/field-outbox-store';
import { formatDate } from '@/lib/utils';

export default function FieldPeoplePage() {
  const { data, isLoading, isError, error, refetch } = useParticipants();
  const online = useFieldOutbox((s) => s.online);
  const [q, setQ] = useState('');
  const people = (data?.data?.data ?? []).filter((p) => !q || p.displayName.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground">People</h1>
          <p className="mt-1 text-[16px] text-foreground-secondary">Participants you registered or are interviewing.</p>
        </div>
      </header>

      <Button size="xl" className="w-full" asChild>
        <Link href="/field/participants/new">
          <Plus className="h-5 w-5" aria-hidden /> Register a participant
        </Link>
      </Button>

      {(data?.data?.data?.length ?? 0) > 5 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-tertiary" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a person" aria-label="Find a person" className="h-control-lg pl-11" />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      ) : isError ? (
        <ErrorState
          kind={!online ? 'offline' : undefined}
          message={!online ? 'The people list needs a connection. Your assigned interviews are still on the Today screen.' : (error as { message?: string })?.message}
          onRetry={() => refetch()}
        />
      ) : people.length === 0 ? (
        <p className="rounded-2xl bg-field-card px-4 py-8 text-center text-[16px] text-foreground-secondary ring-1 ring-field-line">
          {q ? 'Nobody matches that name.' : 'No participants yet.'}
        </p>
      ) : (
        <ul className="divide-y divide-field-line overflow-hidden rounded-2xl bg-field-card ring-1 ring-field-line">
          {people.map((p) => (
            <li key={p.id}>
              <Link href={`/field/participants/${p.id}`} className="flex min-h-[64px] items-center gap-3 px-4 py-3 active:bg-background-hover">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold text-foreground">{p.displayName}</span>
                  <span className="block text-[14px] text-foreground-secondary">
                    {p.externalRef ? `${p.externalRef} · ` : ''}Added {formatDate(p.createdAt)}
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 text-foreground-tertiary" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
