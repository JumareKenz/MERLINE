'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ClipboardList, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { FilterChips } from '@/components/shared/filter-chips';
import { InterviewTable } from '@/components/interviews/interview-table';
import { useInterviews } from '@/hooks/use-interviews';

type View = 'open' | 'done' | 'all';

/**
 * An assignment is an interview scheduled for a named field interviewer.
 * It appears on their field app (and only theirs — the API scopes it) the
 * next time the app has a connection.
 */
function AssignmentsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const view = (params.get('view') as View) || 'open';

  const { data, isLoading, isError, error, refetch } = useInterviews();
  const all = useMemo(() => data?.data?.data ?? [], [data]);
  const open = all.filter((i) => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS');
  const done = all.filter((i) => i.status === 'COMPLETED' || i.status === 'CANCELLED');
  const rows = view === 'open' ? open : view === 'done' ? done : all;

  const newButton = (
    <Button asChild>
      <Link href="/assignments/new">
        <Plus className="h-4 w-4" aria-hidden /> New assignment
      </Link>
    </Button>
  );

  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Interviews allocated to field interviewers. Each one appears in that interviewer's field app, ready to record — even offline once synced."
        actions={newButton}
      />
      <InterviewTable
        data={rows}
        isLoading={isLoading}
        isError={isError}
        error={error as { message?: string; status?: number } | null}
        onRetry={() => refetch()}
        emptyTitle={view === 'open' ? 'No open assignments' : 'No assignments here'}
        emptyDescription="Assign a consented participant to a field interviewer to put an interview on their device."
        emptyAction={view === 'open' ? newButton : undefined}
        toolbar={
          all.length > 0 && (
            <FilterChips<View>
              label="Assignment state"
              value={view}
              onChange={(v) => router.replace(v === 'open' ? pathname : `${pathname}?view=${v}`)}
              options={[
                { value: 'open', label: 'Open', count: open.length },
                { value: 'done', label: 'Done', count: done.length },
                { value: 'all', label: 'All', count: all.length },
              ]}
            />
          )
        }
      />
      <p className="mt-6 flex items-center gap-2 text-[13px] text-foreground-tertiary">
        <ClipboardList className="h-4 w-4" aria-hidden />
        Field interviewers sign in at field.jrecc.org with an access code from Settings → Members.
      </p>
    </div>
  );
}

export default function AssignmentsPage() {
  return (
    <Suspense>
      <AssignmentsView />
    </Suspense>
  );
}
