'use client';

import { useMemo } from 'react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, MoreHorizontal, Star, Trash2, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import type { Workspace } from '@/types/workspace';

interface WorkspaceListProps {
  data: Workspace[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onEdit?: (workspace: Workspace) => void;
  onDelete?: (workspace: Workspace) => void;
  onSetDefault?: (workspace: Workspace) => void;
}

export function WorkspaceList({ data, isLoading, isError, error, onRetry, onEdit, onDelete, onSetDefault }: WorkspaceListProps) {
  const columnHelper = createColumnHelper<Workspace>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Name',
        cell: ({ getValue, row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{getValue()}</span>
            {row.original.is_default && (
              <Badge variant="primary" size="sm">Default</Badge>
            )}
          </div>
        ),
      }),
      columnHelper.accessor('slug', {
        header: 'Slug',
        cell: ({ getValue }) => <span className="text-foreground-secondary">{getValue()}</span>,
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        cell: ({ getValue }) => getValue() || '—',
      }),
      columnHelper.accessor('member_count', {
        header: 'Members',
        cell: ({ getValue }) => (
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-foreground-tertiary" />
            <span>{getValue()}</span>
          </div>
        ),
      }),
      columnHelper.accessor('created_at', {
        header: 'Created',
        cell: ({ getValue }) => formatDate(getValue()),
      }),
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
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(row.original)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              )}
              {onSetDefault && !row.original.is_default && (
                <DropdownMenuItem onClick={() => onSetDefault(row.original)}>
                  <Star className="mr-2 h-4 w-4" /> Set as Default
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={() => onDelete(row.original)} className="text-error">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ] as ColumnDef<Workspace>[],
    [onEdit, onDelete, onSetDefault, columnHelper]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={onRetry}
      searchable
      searchPlaceholder="Search workspaces..."
      emptyTitle="No workspaces yet"
      emptyDescription="Create your first workspace to organize your work."
    />
  );
}
