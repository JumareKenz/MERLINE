'use client';

import { useMemo } from 'react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit, MoreHorizontal, Trash2, Shield, UserMinus } from 'lucide-react';
import { formatDateTime, getInitials } from '@/lib/utils';
import type { Member } from '@/types/user';

interface UserTableProps {
  data: Member[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onEdit?: (user: Member) => void;
  onDelete?: (user: Member) => void;
  onChangeRole?: (user: Member) => void;
}

export function UserTable({ data, isLoading, isError, error, onRetry, onEdit, onDelete, onChangeRole }: UserTableProps) {
  const columnHelper = createColumnHelper<Member>();

  const columns = useMemo(
    () => [
      columnHelper.accessor('user', {
        header: 'User',
        cell: ({ getValue }) => {
          const user = getValue();
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{getInitials(user.first_name, user.last_name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{user.first_name} {user.last_name}</p>
                <p className="text-xs text-foreground-secondary">{user.email}</p>
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor('role', {
        header: 'Role',
        cell: ({ getValue }) => {
          const role = getValue();
          return <StatusBadge status={role?.slug || 'no-role'} />;
        },
      }),
      columnHelper.accessor('user.status', {
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),
      columnHelper.accessor('user.last_login_at', {
        header: 'Last Login',
        cell: ({ getValue }) => {
          const date = getValue();
          return date ? formatDateTime(date) : 'Never';
        },
      }),
      columnHelper.accessor('joined_at', {
        header: 'Joined',
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
              {onChangeRole && (
                <DropdownMenuItem onClick={() => onChangeRole(row.original)}>
                  <Shield className="mr-2 h-4 w-4" /> Change Role
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={() => onDelete(row.original)} className="text-error">
                  <UserMinus className="mr-2 h-4 w-4" /> Remove
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ] as ColumnDef<Member>[],
    [onEdit, onDelete, onChangeRole, columnHelper]
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
      searchPlaceholder="Search users..."
      emptyTitle="No users found"
      emptyDescription="Invite users to your organization to get started."
    />
  );
}
