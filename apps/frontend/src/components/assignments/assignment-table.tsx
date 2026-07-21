'use client';

import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { AssignmentProgress } from './assignment-progress';
import { formatDate, getInitials } from '@/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type { Assignment } from '@/types/assignment';

const COLUMNS: ColumnDef<Assignment>[] = [
  {
    accessorKey: 'enumerator',
    header: 'Enumerator',
    cell: ({ row }) => {
      const e = row.original.enumerator;
      if (!e) return <span className="text-foreground-tertiary">—</span>;
      return <span className="font-medium">{getInitials(e.first_name, e.last_name)}</span>;
    },
  },
  {
    id: 'questionnaire',
    header: 'Questionnaire',
    cell: ({ row }) => <span className="max-w-[200px] truncate block">{row.original.questionnaire?.title || '—'}</span>,
  },
  {
    accessorKey: 'target_count',
    header: 'Target',
    cell: ({ row }) => <span className="tabular-nums">{row.original.target_count}</span>,
  },
  {
    accessorKey: 'completed_count',
    header: 'Completed',
    cell: ({ row }) => <span className="tabular-nums">{row.original.completed_count}</span>,
  },
  {
    id: 'progress',
    header: 'Progress',
    cell: ({ row }) => (
      <AssignmentProgress target={row.original.target_count} completed={row.original.completed_count} size="sm" />
    ),
  },
  {
    accessorKey: 'due_date',
    header: 'Due',
    cell: ({ row }) => (row.original.due_date ? <span className="text-sm">{formatDate(row.original.due_date)}</span> : <span className="text-foreground-tertiary">—</span>),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

interface AssignmentTableProps {
  data: Assignment[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function AssignmentTable({ data, isLoading, isError, error, onRetry }: AssignmentTableProps) {
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
      searchPlaceholder="Search assignments..."
      emptyTitle="No assignments found"
      emptyDescription="Create an assignment to start collecting data."
    />
  );
}
