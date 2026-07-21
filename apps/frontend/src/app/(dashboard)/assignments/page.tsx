'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAssignments } from '@/hooks/use-assignments';
import { AssignmentTable } from '@/components/assignments/assignment-table';
import { AssignmentCard } from '@/components/assignments/assignment-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { useState } from 'react';

export default function AssignmentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState<'table' | 'card'>('table');

  const page = Number(searchParams.get('page') ?? '1');
  const status = searchParams.get('status') ?? undefined;
  const studyId = searchParams.get('study_id') ?? undefined;
  const enumeratorId = searchParams.get('enumerator_id') ?? undefined;
  const dateFrom = searchParams.get('date_from') ?? undefined;
  const dateTo = searchParams.get('date_to') ?? undefined;

  const { data, isLoading, isError, error, refetch } = useAssignments({
    page,
    per_page: 25,
    status,
    study_id: studyId,
    enumerator_id: enumeratorId,
    date_from: dateFrom,
    date_to: dateTo,
  });

  const assignments = data?.data?.data || [];
  const meta = data?.data?.meta;

  const setFilter = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assignments</h1>
          <p className="text-foreground-secondary mt-1">Manage data collection assignments for enumerators.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView(view === 'table' ? 'card' : 'table')}
          >
            {view === 'table' ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </Button>
          <Link href="/assignments/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Assignment
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={status || ''}
          onChange={(e) => setFilter('status', e.target.value || undefined)}
          className="h-10 rounded-md border border-border bg-background-inset px-3 text-sm"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <Input
          type="date"
          value={dateFrom || ''}
          onChange={(e) => setFilter('date_from', e.target.value || undefined)}
          className="w-40"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo || ''}
          onChange={(e) => setFilter('date_to', e.target.value || undefined)}
          className="w-40"
          placeholder="To"
        />
      </div>

      {isLoading ? (
        view === 'table' ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-32" />)}
          </div>
        )
      ) : isError ? (
        <ErrorState message={error?.message} onRetry={() => refetch()} />
      ) : view === 'table' ? (
        <AssignmentTable data={assignments} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assignments.map((a) => (
            <AssignmentCard key={a.id} assignment={a} />
          ))}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setFilter('page', String(page - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-foreground-secondary">
            Page {meta.current_page} of {meta.last_page}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= meta.last_page}
            onClick={() => setFilter('page', String(page + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
