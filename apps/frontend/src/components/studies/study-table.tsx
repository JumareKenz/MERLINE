'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { DataTable } from '@/components/shared/data-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StudyStatusBadge } from './study-status-badge';
import { formatDate } from '@/lib/utils';
import type { Study } from '@/types/study';

interface StudyTableProps {
  data: Study[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function StudyTable({ data, isLoading, isError, error, onRetry }: StudyTableProps) {
  const columns: ColumnDef<Study>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <Link href={`/studies/${row.original.id}`} className="font-medium text-foreground-link hover:underline">
          {row.original.code}
        </Link>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <Link href={`/studies/${row.original.id}`} className="hover:underline">
          {row.original.title}
        </Link>
      ),
    },
    {
      accessorKey: 'study_type',
      header: 'Type',
      cell: ({ row }) => (
          <span className="text-xs capitalize">{(row.original.study_type || row.original.type || '').replace(/_/g, ' ')}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StudyStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'start_date',
      header: 'Start',
      cell: ({ row }) => formatDate(row.original.start_date || ''),
    },
    {
      accessorKey: 'end_date',
      header: 'End',
      cell: ({ row }) => formatDate(row.original.end_date || ''),
    },
    {
      id: 'actions',
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Clone</DropdownMenuItem>
            <DropdownMenuItem className="text-error">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
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
      searchPlaceholder="Search studies..."
    />
  );
}
