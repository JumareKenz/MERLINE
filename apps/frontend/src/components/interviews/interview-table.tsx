'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/utils';
import type { Interview } from '@/types/interview';

interface InterviewTableProps {
  data: Interview[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function InterviewTable({ data, isLoading, isError, error, onRetry }: InterviewTableProps) {
  const columns: ColumnDef<Interview>[] = [
    {
      accessorKey: 'id',
      header: 'Interview',
      cell: ({ row }) => (
        <Link href={`/interviews/${row.original.id}`} className="font-medium text-foreground-link hover:underline">
          {row.original.id.slice(0, 8)}
        </Link>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }) => row.original.location || <span className="text-foreground-tertiary">—</span>,
    },
    {
      accessorKey: 'scheduledAt',
      header: 'Scheduled',
      cell: ({ row }) => (row.original.scheduledAt ? formatDate(row.original.scheduledAt) : '—'),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={onRetry}
      searchable
      searchPlaceholder="Search interviews..."
      emptyTitle="No interviews yet"
      emptyDescription="Start an interview from a participant's page once consent is on file."
    />
  );
}
