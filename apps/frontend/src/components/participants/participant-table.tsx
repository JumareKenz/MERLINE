'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { DataTable } from '@/components/shared/data-table';
import { formatDate } from '@/lib/utils';
import type { Participant } from '@/types/participant';

interface ParticipantTableProps {
  data: Participant[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function ParticipantTable({ data, isLoading, isError, error, onRetry }: ParticipantTableProps) {
  const columns: ColumnDef<Participant>[] = [
    {
      accessorKey: 'displayName',
      header: 'Name',
      cell: ({ row }) => (
        <Link href={`/participants/${row.original.id}`} className="font-medium text-foreground-link hover:underline">
          {row.original.displayName}
        </Link>
      ),
    },
    {
      accessorKey: 'externalRef',
      header: 'External Ref',
      cell: ({ row }) => row.original.externalRef || <span className="text-foreground-tertiary">—</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Added',
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
      searchPlaceholder="Search participants..."
      emptyTitle="No participants yet"
      emptyDescription="Add a participant to begin recording consent and scheduling interviews."
    />
  );
}
