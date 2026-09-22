'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { Sparkles, User } from 'lucide-react';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/utils';
import type { Finding } from '@/types/finding';

interface FindingTableProps {
  data: Finding[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function FindingTable({ data, isLoading, isError, error, onRetry }: FindingTableProps) {
  const columns: ColumnDef<Finding>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <Link href={`/findings/${row.original.id}`} className="font-medium text-foreground-link hover:underline">
          {row.original.title}
        </Link>
      ),
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) =>
        row.original.source === 'AI' ? (
          <span className="inline-flex items-center gap-1 text-[12px] text-foreground-tertiary">
            <Sparkles className="h-3 w-3" /> AI
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[12px] text-foreground-tertiary">
            <User className="h-3 w-3" /> Human
          </span>
        ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: '_count',
      header: 'Evidence',
      cell: ({ row }) => `${row.original._count?.quotations ?? 0} quote${row.original._count?.quotations === 1 ? '' : 's'}`,
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
      searchPlaceholder="Search findings..."
      emptyTitle="No findings yet"
      emptyDescription="Findings come from quoting transcript segments — start from a completed transcript."
    />
  );
}
