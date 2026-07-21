'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';
import type { Questionnaire } from '@/types/questionnaire';

const STATUS_MAP: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  under_review: 'warning',
  approved: 'success',
  published: 'primary',
  archived: 'info',
};

interface QuestionnaireTableProps {
  data: Questionnaire[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function QuestionnaireTable({ data, isLoading, isError, error, onRetry }: QuestionnaireTableProps) {
  const columns: ColumnDef<Questionnaire>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <Link href={`/questionnaires/${row.original.id}`} className="font-medium text-foreground-link hover:underline">
          {row.original.title}
        </Link>
      ),
    },
    {
      accessorKey: 'questionnaire_type',
      header: 'Type',
      cell: ({ row }) => <span className="text-xs capitalize">{row.original.questionnaire_type.replace(/_/g, ' ')}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} variant={STATUS_MAP[row.original.status] || 'default'} />,
    },
    {
      accessorKey: 'version',
      header: 'Version',
    },
    {
      accessorKey: 'question_count',
      header: 'Questions',
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      cell: ({ row }) => formatDate(row.original.updated_at),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/questionnaires/${row.original.id}/edit`}>Edit</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/questionnaires/${row.original.id}/preview`}>Preview</Link>
            </DropdownMenuItem>
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
      searchPlaceholder="Search questionnaires..."
    />
  );
}
