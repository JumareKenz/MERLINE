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
import { ProjectStatusBadge } from './project-status-badge';
import { formatDate } from '@/lib/utils';
import type { Project } from '@/types/project';

interface ProjectTableProps {
  data: Project[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ProjectTable({ data, isLoading, isError, error, onRetry, onEdit, onDelete }: ProjectTableProps) {
  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <Link href={`/projects/${row.original.id}`} className="font-medium text-foreground-link hover:underline">
          {row.original.code}
        </Link>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <Link href={`/projects/${row.original.id}`} className="hover:underline">
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <ProjectStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'study_count',
      header: 'Studies',
    },
    {
      accessorKey: 'start_date',
      header: 'Start Date',
      cell: ({ row }) => formatDate(row.original.start_date),
    },
    {
      accessorKey: 'end_date',
      header: 'End Date',
      cell: ({ row }) => formatDate(row.original.end_date),
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
            <DropdownMenuItem onClick={() => onEdit?.(row.original.id)}>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-error" onClick={() => onDelete?.(row.original.id)}>
              Delete
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
      searchPlaceholder="Search projects..."
    />
  );
}
