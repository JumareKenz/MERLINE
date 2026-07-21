'use client';

import { useMemo } from 'react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, MoreHorizontal, Shield, Trash2 } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import type { Role } from '@/types/role';

interface RoleListProps {
  data: Role[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onEdit?: (role: Role) => void;
  onDelete?: (role: Role) => void;
}

export function RoleList({ data, isLoading, isError, error, onRetry, onEdit, onDelete }: RoleListProps) {
  const columnHelper = createColumnHelper<Role>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Role',
        cell: ({ getValue, row }) => (
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-foreground-tertiary" />
            <span className="font-medium">{getValue()}</span>
            {row.original.is_system && (
              <Badge variant="primary" size="sm">System</Badge>
            )}
          </div>
        ),
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        cell: ({ getValue }) => getValue() || '—',
      }),
      columnHelper.accessor('permissions', {
        header: 'Permissions',
        cell: ({ getValue }) => {
          const perms = getValue();
          return <span className="text-sm text-foreground-secondary">{perms?.length || 0} permissions</span>;
        },
      }),
      columnHelper.accessor('user_count', {
        header: 'Users',
        cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
      }),
      columnHelper.accessor('created_at', {
        header: 'Created',
        cell: ({ getValue }) => formatDateTime(getValue()),
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
              {onDelete && !row.original.is_system && (
                <DropdownMenuItem onClick={() => onDelete(row.original)} className="text-error">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ] as ColumnDef<Role>[],
    [onEdit, onDelete, columnHelper]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      isError={isError}
      error={error}
      onRetry={onRetry}
      emptyTitle="No roles found"
      emptyDescription="Create roles to manage user permissions."
    />
  );
}
