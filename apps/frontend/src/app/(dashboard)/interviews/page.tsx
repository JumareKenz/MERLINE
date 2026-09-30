'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarPlus, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { FilterChips } from '@/components/shared/filter-chips';
import { InterviewTable } from '@/components/interviews/interview-table';
import { NativeSelect } from '@/components/ui/native-select';
import { useInterviews } from '@/hooks/use-interviews';
import { useSession } from '@/hooks/use-session';
import { typeLabel } from '@/lib/interview-types';
import type { InterviewStatus } from '@/types/interview';

type StatusFilter = 'ALL' | InterviewStatus;

function SubmissionsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = (params.get('status') as StatusFilter) || 'ALL';
  const type = params.get('type') || '';
  const session = useSession();

  const { data, isLoading, isError, error, refetch } = useInterviews();
  const all = useMemo(() => data?.data?.data ?? [], [data]);
  const types = useMemo(() => [...new Set(all.map((i) => i.type).filter((t): t is string => !!t))].sort(), [all]);
  const byType = type ? all.filter((i) => i.type === type) : all;
  const filtered = status === 'ALL' ? byType : byType.filter((i) => i.status === status);
  const count = (s: InterviewStatus) => byType.filter((i) => i.status === s).length;
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== 'ALL') next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div>
      <PageHeader
        title="Submissions"
        description="Every interview collected across your projects: its type, consent, recordings and state. Open one to play the recording and follow its transcript."
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/participants">
                <UserRound className="h-4 w-4" aria-hidden /> Participants
              </Link>
            </Button>
            {(!session.isResolved || session.can('create.interviews')) && (
              <Button variant="secondary" asChild>
                <Link href="/assignments/new">
                  <CalendarPlus className="h-4 w-4" aria-hidden /> Book an interview
                </Link>
              </Button>
            )}
          </>
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
            <div className="flex flex-wrap items-center gap-3">
            {types.length > 1 && (
              <NativeSelect aria-label="Interview type" className="w-52" value={type} onChange={(e) => setParam('type', e.target.value)}>
                <option value="">All interview types</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {typeLabel(t)}
                  </option>
                ))}
              </NativeSelect>
            )}
            <FilterChips<StatusFilter>
              label="Interview status"
              value={status}
              onChange={(v) => setParam('status', v)}
              options={[
                { value: 'ALL', label: 'All', count: byType.length },
                { value: 'SCHEDULED', label: 'Scheduled', count: count('SCHEDULED') },
                { value: 'IN_PROGRESS', label: 'In progress', count: count('IN_PROGRESS') },
                { value: 'COMPLETED', label: 'Completed', count: count('COMPLETED') },
              ]}
            />
            </div>
          )
        }
      />
    </div>
  );
}

export default function SubmissionsPage() {
  return (
    <Suspense>
      <SubmissionsView />
    </Suspense>
  );
}
