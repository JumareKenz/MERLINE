'use client';

import type { ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { AudioLines, ShieldCheck, ShieldOff } from 'lucide-react';
import { CellMuted, DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/utils';
import type { Interview } from '@/types/interview';

interface InterviewTableProps {
  data: Interview[];
  isLoading?: boolean;
  isError?: boolean;
  error?: { message?: string; status?: number } | null;
  onRetry?: () => void;
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  /** Hide the interviewer column (e.g. when already filtered to one person). */
  hideInterviewer?: boolean;
}

export function ConsentCell({ consent }: { consent?: Interview['consent'] }) {
  if (!consent) return <CellMuted>—</CellMuted>;
  const withdrawn = !!consent.withdrawnAt;
  const recordingAllowed = consent.allowRecording && !withdrawn;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px]">
      {recordingAllowed ? (
        <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
      ) : (
        <ShieldOff className="h-4 w-4 text-foreground-tertiary" aria-hidden />
      )}
      <span className={recordingAllowed ? 'text-foreground' : 'text-foreground-secondary'}>
        {withdrawn ? 'Withdrawn' : recordingAllowed ? 'Recording allowed' : 'No recording'}
      </span>
    </span>
  );
}

export function InterviewTable({
  data,
  isLoading,
  isError,
  error,
  onRetry,
  toolbar,
  emptyTitle = 'No interviews yet',
  emptyDescription = 'Interviews appear here once a participant has consent on file and an interview is started or assigned.',
  emptyAction,
  hideInterviewer,
}: InterviewTableProps) {
  const columns: ColumnDef<Interview>[] = [
    {
      id: 'participant',
      accessorFn: (row) => row.participant?.displayName ?? '',
      header: 'Participant',
      cell: ({ row }) => (
        <Link href={`/interviews/${row.original.id}`} className="font-medium text-foreground hover:text-foreground-link hover:underline">
          {row.original.participant?.displayName ?? `Interview ${row.original.id.slice(0, 8)}`}
        </Link>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    ...(hideInterviewer
      ? []
      : [
          {
            id: 'interviewer',
            accessorFn: (row: Interview) => (row.interviewer ? `${row.interviewer.firstName} ${row.interviewer.lastName}` : ''),
            header: 'Interviewer',
            cell: ({ getValue }: { getValue: () => unknown }) => <CellMuted>{(getValue() as string) || '—'}</CellMuted>,
          } satisfies ColumnDef<Interview>,
        ]),
    {
      id: 'consent',
      header: 'Consent',
      enableSorting: false,
      cell: ({ row }) => <ConsentCell consent={row.original.consent} />,
    },
    {
      id: 'recordings',
      accessorFn: (row) => row._count?.recordings ?? 0,
      header: 'Audio',
      cell: ({ getValue }) => {
        const n = getValue() as number;
        return (
          <span className="inline-flex items-center gap-1.5 text-[13px] tabular-nums text-foreground-secondary">
            <AudioLines className="h-4 w-4 text-foreground-tertiary" aria-hidden />
            {n === 0 ? 'None' : `${n} file${n === 1 ? '' : 's'}`}
          </span>
        );
      },
    },
    {
      id: 'when',
      accessorFn: (row) => row.scheduledAt ?? row.createdAt,
      header: 'Date',
      cell: ({ row }) => (
        <CellMuted>
          {row.original.scheduledAt ? `Scheduled ${formatDate(row.original.scheduledAt)}` : formatDate(row.original.createdAt)}
        </CellMuted>
      ),
    },
  ];

  return (
    <DataTable
      label="Interviews"
      columns={columns}
      data={data}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={onRetry}
      searchable
      searchPlaceholder="Search by participant or interviewer"
      toolbar={toolbar}
      emptyIcon={<AudioLines />}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyAction={emptyAction}
    />
  );
}
