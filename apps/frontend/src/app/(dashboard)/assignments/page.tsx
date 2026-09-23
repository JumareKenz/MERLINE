'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { InterviewTable } from '@/components/interviews/interview-table';
import { FieldTeamPanel } from '@/components/field-team/field-team-panel';
import { useInterviews } from '@/hooks/use-interviews';
import { cn } from '@/lib/utils';

type Tab = 'team' | 'booked';

/**
 * Assignments are people-to-projects. A field worker assigned to a project
 * meets participants on site and records their consent and interview in
 * the field app; nobody needs to set participants up here first.
 * Booking a specific interview in advance (for a participant who is
 * already registered) remains available as a secondary option.
 */
function AssignmentsView() {
  const router = useRouter();
  const pathname = usePathname();
  const tab = (useSearchParams().get('tab') as Tab) || 'team';
  const { data, isLoading, isError, error, refetch } = useInterviews();
  const booked = useMemo(
    () => (data?.data?.data ?? []).filter((i) => i.status === 'SCHEDULED'),
    [data],
  );

  return (
    <div>
      <PageHeader
        title="Assignments"
        description="Who collects interviews, and for which projects. Field workers sign in to the field app with their access code, meet participants on site, record consent and interview them — offline if they need to."
      />

      <div role="tablist" aria-label="Assignments" className="mb-6 flex gap-6 border-b border-border-subtle">
        {(
          [
            ['team', 'Field team'],
            ['booked', `Booked interviews${booked.length ? ` · ${booked.length}` : ''}`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => router.replace(key === 'team' ? pathname : `${pathname}?tab=${key}`)}
            className={cn(
              '-mb-px h-11 border-b-2 text-[14px] font-medium transition-colors',
              tab === key ? 'border-primary text-foreground' : 'border-transparent text-foreground-secondary hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'team' ? (
          <FieldTeamPanel />
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-[14px] text-foreground-secondary">
                Optional: book an interview in advance for someone already registered and consented. It appears on that field worker&apos;s Today
                screen. Most interviews are started on site instead.
              </p>
              <Button variant="secondary" asChild>
                <Link href="/assignments/new">
                  <CalendarPlus className="h-4 w-4" aria-hidden /> Book an interview
                </Link>
              </Button>
            </div>
            <InterviewTable
              data={booked}
              isLoading={isLoading}
              isError={isError}
              error={error as { message?: string; status?: number } | null}
              onRetry={() => refetch()}
              emptyTitle="No booked interviews"
              emptyDescription="That's normal: field workers start most interviews on site. Book one here only when a time and participant are arranged in advance."
            />
          </>
        )}
      </div>
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
