'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { NotebookText } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ReportsTabs } from '@/components/analysis/reports-tabs';
import { CellMuted, DataTable } from '@/components/shared/data-table';
import { FilterChips } from '@/components/shared/filter-chips';
import { StatusBadge } from '@/components/shared/status-badge';
import { useAllAnalysisReports } from '@/hooks/use-analysis-reports';
import { useSession } from '@/hooks/use-session';
import { formatDate } from '@/lib/utils';
import type { AnalysisReport, ReportScope } from '@/types/analysis-report';

type Filter = 'ALL' | ReportScope;

const SCOPE_LABEL: Record<ReportScope, string> = { INTERVIEW: 'Interview report', PROJECT: 'Project report', CUSTOM: 'Research brief' };

const columns: ColumnDef<AnalysisReport>[] = [
  {
    accessorKey: 'title',
    header: 'Report',
    cell: ({ row }) => (
      <Link href={`/analysis/${row.original.id}`} className="font-medium text-foreground hover:text-foreground-link hover:underline">
        {row.original.title}
      </Link>
    ),
  },
  { id: 'scope', accessorFn: (r) => SCOPE_LABEL[r.scope], header: 'Kind', cell: ({ getValue }) => <CellMuted>{getValue() as string}</CellMuted> },
  { id: 'project', accessorFn: (r) => r.project?.name ?? '', header: 'Project', cell: ({ getValue }) => <CellMuted>{(getValue() as string) || '—'}</CellMuted> },
  { id: 'status', accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  {
    id: 'sources',
    accessorFn: (r) => r.sourceCount,
    header: 'Approved interviews',
    cell: ({ getValue }) => <CellMuted className="tabular-nums">{getValue() as number}</CellMuted>,
  },
  { id: 'created', accessorFn: (r) => r.completedAt ?? r.createdAt, header: 'Written', cell: ({ row }) => <CellMuted>{formatDate(row.original.completedAt ?? row.original.createdAt)}</CellMuted> },
];

function ReportsIndex() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const session = useSession();
  const filter = (params.get('kind') as Filter) || 'ALL';
  const { data, isLoading, isError, error, refetch } = useAllAnalysisReports(!session.isResolved || session.can('view.reports'));
  const all = useMemo(() => data ?? [], [data]);
  const rows = filter === 'ALL' ? all : all.filter((r) => r.scope === filter);
  const count = (s: ReportScope) => all.filter((r) => r.scope === s).length;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Written from approved transcripts only. Every quotation is verbatim and traceable to a speaker and timestamp, findings state how strong their evidence is, and interview types are compared against each other. Start a report from a project or an interview."
      />
      <ReportsTabs />
      <DataTable
        label="Reports"
        columns={columns}
        data={rows}
        isLoading={isLoading}
        isError={isError}
        error={error as { message?: string; status?: number } | null}
        onRetry={() => refetch()}
        searchable
        searchPlaceholder="Search reports"
        emptyIcon={<NotebookText />}
        emptyTitle={filter === 'ALL' ? 'No reports yet' : 'Nothing of this kind'}
        emptyDescription="Reports need approved transcripts. Approve one under Transcripts, then write a report from its interview or from the project page."
        emptyAction={
          filter === 'ALL' && (
            <Link href="/transcripts?stage=ADMIN" className="text-[14px] font-medium text-foreground-link hover:underline">
              Transcripts waiting for approval
            </Link>
          )
        }
        toolbar={
          all.length > 0 && (
            <FilterChips<Filter>
              label="Report kind"
              value={filter}
              onChange={(v) => router.replace(v === 'ALL' ? pathname : `${pathname}?kind=${v}`)}
              options={[
                { value: 'ALL', label: 'All', count: all.length },
                { value: 'PROJECT', label: 'Project', count: count('PROJECT') },
                { value: 'INTERVIEW', label: 'Interview', count: count('INTERVIEW') },
                { value: 'CUSTOM', label: 'Briefs', count: count('CUSTOM') },
              ]}
            />
          )
        }
      />
    </div>
  );
}

export default function ReportsIndexPage() {
  return (
    <Suspense>
      <ReportsIndex />
    </Suspense>
  );
}
