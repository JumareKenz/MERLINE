'use client';

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { FileText } from 'lucide-react';
import { NativeSelect } from '@/components/ui/native-select';
import { PageHeader } from '@/components/layout/page-header';
import { CellMuted, DataTable } from '@/components/shared/data-table';
import { FilterChips } from '@/components/shared/filter-chips';
import { StatusBadge } from '@/components/shared/status-badge';
import { ReviewStatusBadge } from '@/components/transcripts/review-status-badge';
import { useAllTranscripts } from '@/hooks/use-transcripts';
import { useResearchProjects } from '@/hooks/use-research-projects';
import { STANDARD_TYPE_LABELS, typeLabel } from '@/lib/interview-types';
import { formatDate } from '@/lib/utils';
import type { ReviewStatus } from '@/types/review';
import type { TranscriptSummary } from '@/types/transcript';

/** Stages as an administrator thinks of them; each maps to review statuses (or machine failure). */
type Stage = 'ALL' | 'ADMIN' | 'ENUMERATOR' | 'PROCESSING' | 'APPROVED' | 'FAILED';
const STAGES: Record<Exclude<Stage, 'ALL' | 'FAILED'>, ReviewStatus[]> = {
  ADMIN: ['SUBMITTED_FOR_ADMIN_REVIEW'],
  ENUMERATOR: ['AVAILABLE_FOR_REVIEW', 'ENUMERATOR_EDITING', 'RETURNED_FOR_CORRECTION'],
  PROCESSING: ['RECORDING_SUBMITTED', 'TRANSCRIPTION_PROCESSING'],
  APPROVED: ['APPROVED', 'LOCKED'],
};
const REVIEW_PARAM_TO_STAGE: Record<string, Stage> = {
  SUBMITTED_FOR_ADMIN_REVIEW: 'ADMIN',
  AVAILABLE_FOR_REVIEW: 'ENUMERATOR',
  TRANSCRIPTION_PROCESSING: 'PROCESSING',
};

function inStage(t: TranscriptSummary, stage: Stage): boolean {
  if (stage === 'ALL') return true;
  if (stage === 'FAILED') return t.status === 'FAILED';
  return !!t.reviewStatus && STAGES[stage].includes(t.reviewStatus) && t.status !== 'FAILED';
}

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
  { id: 'type', accessorFn: (t) => typeLabel(t.interview?.type), header: 'Type', cell: ({ getValue }) => <CellMuted>{getValue() as string}</CellMuted> },
  {
    id: 'review',
    accessorFn: (t) => t.reviewStatus ?? '',
    header: 'Review',
    cell: ({ row }) => (row.original.status === 'FAILED' ? <StatusBadge status="failed" label="Transcription failed" /> : <ReviewStatusBadge status={row.original.reviewStatus} />),
  },
  {
    id: 'enumerator',
    accessorFn: (t) => t.interview?.enumeratorName ?? '',
    header: 'Enumerator',
    cell: ({ getValue }) => <CellMuted>{(getValue() as string) || '—'}</CellMuted>,
  },
  {
    id: 'segments',
    accessorFn: (t) => t._count?.segments ?? 0,
    header: 'Segments',
    cell: ({ getValue }) => <CellMuted className="tabular-nums">{getValue() as number}</CellMuted>,
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
  const reviewParam = params.get('review') ?? '';
  const stage = (params.get('stage') as Stage) || REVIEW_PARAM_TO_STAGE[reviewParam] || 'ALL';
  const type = params.get('type') ?? '';
  const project = params.get('project') ?? '';
  const projects = useResearchProjects();
  const { data, isLoading, isError, error, refetch } = useAllTranscripts(true, {
    ...(type && { type }),
    ...(project && { projectId: project }),
  });
  const all = useMemo(() => data ?? [], [data]);
  const rows = all.filter((t) => inStage(t, stage));
  const count = (s: Stage) => all.filter((t) => inStage(t, s)).length;
  const types = useMemo(() => [...new Set([...Object.keys(STANDARD_TYPE_LABELS), ...all.map((t) => t.interview?.type).filter((x): x is string => !!x), ...(type ? [type] : [])])], [all, type]);

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    next.delete('review');
    for (const [k, v] of Object.entries(patch)) {
      if (v && v !== 'ALL') next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div>
      <PageHeader
        title="Transcripts"
        description="Each transcript is checked by the enumerator who recorded it, then approved by you. Only approved transcripts can be quoted, analysed or used in reports."
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
        emptyTitle={stage === 'ALL' && !type && !project ? 'No transcripts yet' : 'Nothing matches'}
        emptyDescription={
          stage === 'ALL' && !type && !project
            ? 'When enumerators submit recordings and consent allows transcription, they appear here to be reviewed and approved.'
            : 'Try another stage, interview type or project.'
        }
        toolbar={
          (all.length > 0 || type || project) && (
            <div className="flex flex-wrap items-center gap-3">
              <NativeSelect aria-label="Interview type" className="w-52" value={type} onChange={(e) => set({ type: e.target.value })}>
                <option value="">All interview types</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {typeLabel(t)}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect aria-label="Project" className="w-52" value={project} onChange={(e) => set({ project: e.target.value })}>
                <option value="">All projects</option>
                {(projects.data?.items ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
              <FilterChips<Stage>
                label="Review stage"
                value={stage}
                onChange={(v) => set({ stage: v })}
                options={[
                  { value: 'ALL', label: 'All', count: all.length },
                  { value: 'ADMIN', label: 'Awaiting approval', count: count('ADMIN') },
                  { value: 'ENUMERATOR', label: 'With enumerator', count: count('ENUMERATOR') },
                  { value: 'PROCESSING', label: 'Transcribing', count: count('PROCESSING') },
                  { value: 'APPROVED', label: 'Approved', count: count('APPROVED') },
                  { value: 'FAILED', label: 'Failed', count: count('FAILED') },
                ]}
              />
            </div>
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
