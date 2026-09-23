'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { FilterChips } from '@/components/shared/filter-chips';
import { InterviewTable } from '@/components/interviews/interview-table';
import { useInterviews } from '@/hooks/use-interviews';
import type { InterviewStatus } from '@/types/interview';

type StatusFilter = 'ALL' | InterviewStatus;

function ResultsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = (params.get('status') as StatusFilter) || 'ALL';

  const { data, isLoading, isError, error, refetch } = useInterviews();
  const all = useMemo(() => data?.data?.data ?? [], [data]);
  const filtered = status === 'ALL' ? all : all.filter((i) => i.status === status);
  const count = (s: InterviewStatus) => all.filter((i) => i.status === s).length;

  return (
    <div>
      <PageHeader
        title="Results"
        description="Every interview collected across your projects — its consent, audio and processing state. Open one to review recordings and request a transcript."
        actions={
          <Button variant="secondary" asChild>
            <Link href="/participants">
              <UserRound className="h-4 w-4" aria-hidden /> Participants
            </Link>
          </Button>
        }
      />
      <InterviewTable
        data={filtered}
        isLoading={isLoading}
        isError={isError}
        error={error as { message?: string; status?: number } | null}
        onRetry={() => refetch()}
        toolbar={
          all.length > 0 && (
            <FilterChips<StatusFilter>
              label="Interview status"
              value={status}
              onChange={(v) => router.replace(v === 'ALL' ? pathname : `${pathname}?status=${v}`)}
              options={[
                { value: 'ALL', label: 'All', count: all.length },
                { value: 'SCHEDULED', label: 'Scheduled', count: count('SCHEDULED') },
                { value: 'IN_PROGRESS', label: 'In progress', count: count('IN_PROGRESS') },
                { value: 'COMPLETED', label: 'Completed', count: count('COMPLETED') },
              ]}
            />
          )
        }
      />
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense>
      <ResultsView />
    </Suspense>
  );
}
