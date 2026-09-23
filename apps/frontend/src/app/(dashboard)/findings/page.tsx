'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { Quote, Sparkles, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { CellMuted, DataTable } from '@/components/shared/data-table';
import { FilterChips } from '@/components/shared/filter-chips';
import { StatusBadge } from '@/components/shared/status-badge';
import { useFindings } from '@/hooks/use-findings';
import { formatDate } from '@/lib/utils';
import type { Finding, FindingStatus } from '@/types/finding';

type Filter = 'ALL' | FindingStatus;

const columns: ColumnDef<Finding>[] = [
  {
    accessorKey: 'title',
    header: 'Finding',
    cell: ({ row }) => (
      <div className="min-w-[220px]">
        <Link href={`/findings/${row.original.id}`} className="font-medium text-foreground hover:text-foreground-link hover:underline">
          {row.original.title}
        </Link>
        {row.original.theme && <p className="text-[13px] text-foreground-tertiary">{row.original.theme}</p>}
      </div>
    ),
  },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  {
    id: 'evidence',
    accessorFn: (f) => f._count?.quotations ?? f.quotations?.length ?? 0,
    header: 'Evidence',
    cell: ({ getValue }) => {
      const n = getValue() as number;
      return (
        <span className={`inline-flex items-center gap-1.5 text-[13px] ${n === 0 ? 'text-foreground-warning' : 'text-foreground-secondary'}`}>
          <Quote className="h-3.5 w-3.5" aria-hidden />
          {n === 0 ? 'No quotations' : `${n} quotation${n === 1 ? '' : 's'}`}
        </span>
      );
    },
  },
  {
    accessorKey: 'source',
    header: 'Drafted by',
    cell: ({ row }) => (
      <CellMuted className="inline-flex items-center gap-1.5">
        {row.original.source === 'AI' ? <Sparkles className="h-3.5 w-3.5" aria-hidden /> : <UserRound className="h-3.5 w-3.5" aria-hidden />}
        {row.original.source === 'AI' ? 'AI, pending review' : 'Researcher'}
      </CellMuted>
    ),
  },
  { id: 'updated', accessorFn: (f) => f.updatedAt, header: 'Updated', cell: ({ row }) => <CellMuted>{formatDate(row.original.updatedAt)}</CellMuted> },
];

function ReportsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filter = (params.get('status') as Filter) || 'ALL';
  const { data, isLoading, isError, error, refetch } = useFindings();
  const all = useMemo(() => data?.data?.data ?? [], [data]);
  const rows = filter === 'ALL' ? all : all.filter((f) => f.status === filter);
  const count = (s: FindingStatus) => all.filter((f) => f.status === s).length;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Findings are the building blocks of a report. Each one must be backed by verbatim quotations from real transcript segments before it can be approved or published."
      />
      <DataTable
        label="Findings"
        columns={columns}
        data={rows}
        isLoading={isLoading}
        isError={isError}
        error={error as { message?: string; status?: number } | null}
        onRetry={() => refetch()}
        searchable
        searchPlaceholder="Search findings"
        emptyIcon={<Quote />}
        emptyTitle={filter === 'ALL' ? 'No findings yet' : 'Nothing in this state'}
        emptyDescription="Open a completed transcript and quote a segment to start a finding, or draft one with AI from the interview page."
        emptyAction={
          filter === 'ALL' && (
            <Link href="/transcripts" className="text-[14px] font-medium text-foreground-link hover:underline">
              Go to transcripts
            </Link>
          )
        }
        toolbar={
          all.length > 0 && (
            <FilterChips<Filter>
              label="Finding status"
              value={filter}
              onChange={(v) => router.replace(v === 'ALL' ? pathname : `${pathname}?status=${v}`)}
              options={[
                { value: 'ALL', label: 'All', count: all.length },
                { value: 'DRAFT', label: 'Draft', count: count('DRAFT') },
                { value: 'IN_REVIEW', label: 'In review', count: count('IN_REVIEW') },
                { value: 'APPROVED', label: 'Approved', count: count('APPROVED') },
                { value: 'PUBLISHED', label: 'Published', count: count('PUBLISHED') },
              ]}
            />
          )
        }
      />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense>
      <ReportsView />
    </Suspense>
  );
}
