'use client';

import { useState } from 'react';
import { UserTable } from '@/components/users/user-table';
import { UserForm } from '@/components/users/user-form';
import { UserRoleSelector } from '@/components/users/user-role-selector';
import { FieldAccessCodeDialog } from '@/components/users/field-access-code-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/use-users';
import { useCurrentOrganizationId } from '@/hooks/use-organizations';
import { useRoles } from '@/hooks/use-roles';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { Member } from '@/types/user';
import type { UserFormData } from '@/lib/validations';
import { toast } from 'sonner';

export default function UsersPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showRoleChange, setShowRoleChange] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showFieldAccess, setShowFieldAccess] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);

  const { data: orgId } = useCurrentOrganizationId();
  const { data: usersData, isLoading, isError, error, refetch } = useUsers(orgId ?? undefined);
  const { data: rolesData } = useRoles();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const members = usersData?.data?.data || [];
  const roles = rolesData?.data?.data || [];

  const handleCreate = async (data: UserFormData) => {
    if (!orgId) return;
    await createUser.mutateAsync({
      orgId,
      data: {
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        role_id: data.role_id,
        send_invite: data.send_invite,
      },
    });
    setShowCreate(false);
  };

  const handleRoleChange = async (_userId: string, roleId: string) => {
    if (!selectedUser || !orgId) return;
    await updateUser.mutateAsync({
      orgId,
      userId: selectedUser.id,
      data: { role_id: roleId },
    });
    setShowRoleChange(false);
    setSelectedUser(null);
  };

  const handleDelete = async () => {
    if (!selectedUser || !orgId) return;
    try {
      await deleteUser.mutateAsync({ orgId, userId: selectedUser.id });
      toast.success('User removed successfully');
    } catch {
      toast.error('Failed to remove user');
    }
    setShowDelete(false);
    setSelectedUser(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Users</h1>
          <p className="text-[13px] text-foreground-tertiary mt-0.5">Manage organization members and their roles</p>
        </div>
        <Button size="sm" className="h-8 px-3 text-[13px]" onClick={() => setShowCreate(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add User
        </Button>
      </div>

      <UserTable
        data={members}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        onChangeRole={(user) => {
          setSelectedUser(user);
          setShowRoleChange(true);
        }}
        onDelete={(user) => {
          setSelectedUser(user);
          setShowDelete(true);
        }}
        onFieldAccess={(user) => {
          setSelectedUser(user);
          setShowFieldAccess(true);
        }}
      />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <UserForm roles={roles} onSubmit={handleCreate} isLoading={createUser.isPending} />
        </DialogContent>
      </Dialog>

      <UserRoleSelector
        open={showRoleChange}
        onOpenChange={setShowRoleChange}
        user={selectedUser}
        roles={roles}
        onSave={handleRoleChange}
      />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Remove User"
        description={`Are you sure you want to remove ${selectedUser?.firstName} ${selectedUser?.lastName} from the organization? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Remove"
        loading={deleteUser.isPending}
        onConfirm={handleDelete}
      />

      <FieldAccessCodeDialog
        open={showFieldAccess}
        onOpenChange={setShowFieldAccess}
        user={selectedUser}
      />
    </div>
  );
}
