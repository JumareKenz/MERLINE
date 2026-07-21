'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { DataTable } from '@/components/shared/data-table';
import { IndicatorStatusBadge } from './indicator-status-badge';
import type { Indicator } from '@/types/indicator';

interface IndicatorTableProps {
  data: Indicator[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  libraryView?: boolean;
}

export function IndicatorTable({ data, isLoading, isError, error, onRetry, libraryView }: IndicatorTableProps) {
  const columns: ColumnDef<Indicator>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <Link href={libraryView ? `/indicators/${row.original.id}` : '#'} className="font-medium text-foreground-link hover:underline">
          {row.original.code}
        </Link>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <span className="text-sm">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'data_type',
      header: 'Data Type',
      cell: ({ row }) => <span className="text-xs capitalize">{row.original.data_type}</span>,
    },
    {
      accessorKey: 'level',
      header: 'Level',
      cell: ({ row }) => <span className="text-xs capitalize">{row.original.level}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <IndicatorStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'target_value',
      header: 'Target',
      cell: ({ row }) => row.original.target_value ?? '-',
    },
    {
      accessorKey: 'current_value',
      header: 'Current',
      cell: ({ row }) => {
        const val = row.original.current_value;
        if (val === undefined || val === null) return <span className="text-foreground-tertiary">-</span>;
        return <span className="font-medium">{val}</span>;
      },
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
      searchPlaceholder="Search indicators..."
    />
  );
}
