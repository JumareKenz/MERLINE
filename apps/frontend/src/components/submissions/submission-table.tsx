'use client';

import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type { Submission } from '@/types/submission';

const COLUMNS: ColumnDef<Submission>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.id.slice(0, 8)}...</span>,
  },
  {
    id: 'enumerator',
    header: 'Enumerator',
    cell: ({ row }) => {
      const e = row.original.enumerator;
      return <span>{e ? `${e.first_name} ${e.last_name}` : '—'}</span>;
    },
  },
  {
    id: 'questionnaire',
    header: 'Questionnaire',
    cell: ({ row }) => <span className="max-w-[180px] truncate block">{row.original.questionnaire?.title || '—'}</span>,
  },
  {
    accessorKey: 'completed_at',
    header: 'Date',
    cell: ({ row }) => (row.original.completed_at ? formatDate(row.original.completed_at) : <span className="text-foreground-tertiary">—</span>),
  },
  {
    accessorKey: 'time_taken_seconds',
    header: 'Duration',
    cell: ({ row }) => {
      const s = row.original.time_taken_seconds;
      if (!s) return <span className="text-foreground-tertiary">—</span>;
      return <span className="tabular-nums">{Math.floor(s / 60)}m</span>;
    },
  },
  {
    accessorKey: 'quality_score',
    header: 'Quality',
    cell: ({ row }) => {
      const score = row.original.quality_score;
      if (score === undefined || score === null) return <span className="text-foreground-tertiary">—</span>;
      const color = score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-error';
      return <span className={`tabular-nums font-medium ${color}`}>{score}%</span>;
    },
  },
  {
    accessorKey: 'flagged_answers',
    header: 'Flags',
    cell: ({ row }) => {
      const count = row.original.flagged_answers;
      if (!count) return <span className="text-foreground-tertiary">0</span>;
      return <span className="text-error tabular-nums font-medium">{count}</span>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'sync_status',
    header: 'Sync',
    cell: ({ row }) => {
      const status = row.original.sync_status;
      const variant = status === 'synced' ? 'success' : status === 'failed' ? 'error' : 'warning';
      return <StatusBadge status={status} variant={variant} />;
    },
  },
];

interface SubmissionTableProps {
  data: Submission[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function SubmissionTable({ data, isLoading, isError, error, onRetry }: SubmissionTableProps) {
  const router = useRouter();

  return (
    <DataTable
      columns={COLUMNS}
      data={data}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={onRetry}
      searchable
      searchPlaceholder="Search submissions..."
      emptyTitle="No submissions found"
      emptyDescription="No submissions recorded yet. Assign enumerators and begin data collection to see submissions."
    />
  );
}
