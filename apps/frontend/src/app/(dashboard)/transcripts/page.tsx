'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { FileText } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { CellMuted, DataTable } from '@/components/shared/data-table';
import { FilterChips } from '@/components/shared/filter-chips';
import { StatusBadge } from '@/components/shared/status-badge';
import { useAllTranscripts } from '@/hooks/use-transcripts';
import { formatDate } from '@/lib/utils';
import type { TranscriptStatus, TranscriptSummary } from '@/types/transcript';

type Filter = 'ALL' | TranscriptStatus;

const columns: ColumnDef<TranscriptSummary>[] = [
  {
    id: 'participant',
    accessorFn: (t) => t.interview?.participant?.displayName ?? '',
    header: 'Participant',
    cell: ({ row }) => {
      const t = row.original;
      const name = t.interview?.participant?.displayName ?? `Transcript ${t.id.slice(0, 8)}`;
      return t.status === 'COMPLETED' ? (
        <Link href={`/transcripts/${t.id}`} className="font-medium text-foreground hover:text-foreground-link hover:underline">
          {name}
        </Link>
      ) : (
        <Link href={`/interviews/${t.interviewId}`} className="font-medium text-foreground hover:underline">
          {name}
        </Link>
      );
    },
  },
  { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
  {
    id: 'segments',
    accessorFn: (t) => t._count?.segments ?? 0,
    header: 'Segments',
    cell: ({ getValue }) => <CellMuted className="tabular-nums">{getValue() as number}</CellMuted>,
  },
  {
    accessorKey: 'language',
    header: 'Language',
    cell: ({ row }) => <CellMuted>{row.original.language ?? '—'}</CellMuted>,
  },
  {
    id: 'requested',
    accessorFn: (t) => t.requestedAt,
    header: 'Requested',
    cell: ({ row }) => <CellMuted>{formatDate(row.original.requestedAt)}</CellMuted>,
  },
];

function TranscriptsView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filter = (params.get('status') as Filter) || 'ALL';
  const { data, isLoading, isError, error, refetch } = useAllTranscripts();
  const all = useMemo(() => data ?? [], [data]);
  const rows =
    filter === 'ALL'
      ? all
      : all.filter((t) => t.status === filter || (filter === 'PROCESSING' && t.status === 'PENDING'));
  const count = (s: TranscriptStatus) => all.filter((t) => t.status === s).length;

  return (
    <div>
      <PageHeader
        title="Transcripts"
        description="Text produced from interview recordings, segment by segment. Open a completed transcript to read, search, quote into a finding, or question it with AI Dialogue."
      />
      <DataTable
        label="Transcripts"
        columns={columns}
        data={rows}
        isLoading={isLoading}
        isError={isError}
        error={error as { message?: string; status?: number } | null}
        onRetry={() => refetch()}
        searchable
        searchPlaceholder="Search by participant"
        emptyIcon={<FileText />}
        emptyTitle={filter === 'ALL' ? 'No transcripts yet' : 'Nothing in this state'}
        emptyDescription="Request a transcript from a recording on the interview page. Consent must permit transcription."
        toolbar={
          all.length > 0 && (
            <FilterChips<Filter>
              label="Transcript status"
              value={filter}
              onChange={(v) => router.replace(v === 'ALL' ? pathname : `${pathname}?status=${v}`)}
              options={[
                { value: 'ALL', label: 'All', count: all.length },
                { value: 'COMPLETED', label: 'Completed', count: count('COMPLETED') },
                { value: 'PROCESSING', label: 'Processing', count: count('PROCESSING') + count('PENDING') },
                { value: 'FAILED', label: 'Failed', count: count('FAILED') },
              ]}
            />
          )
        }
      />
    </div>
  );
}

export default function TranscriptsPage() {
  return (
    <Suspense>
      <TranscriptsView />
    </Suspense>
  );
}
