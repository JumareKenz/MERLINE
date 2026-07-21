'use client';

import { useState } from 'react';
import { RoleList } from '@/components/roles/role-list';
import { RoleForm } from '@/components/roles/role-form';
import { PermissionGrid } from '@/components/roles/permission-grid';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useRoles, useCreateRole, useUpdateRole, useDeleteRole, usePermissions } from '@/hooks/use-roles';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import type { Role } from '@/types/role';
import type { RoleFormData } from '@/lib/validations';
import { toast } from 'sonner';

export default function RolesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);

  const { data: rolesData, isLoading, isError, error, refetch } = useRoles();
  const { data: permissionsData } = usePermissions();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const roles = rolesData?.data?.data || [];
  const permissionGroups = permissionsData?.data?.data || [];

  const handleCreate = async (data: RoleFormData) => {
    await createRole.mutateAsync({
      name: data.name,
      description: data.description,
      permission_ids: selectedPermissionIds,
    });
    setShowCreate(false);
    setSelectedPermissionIds([]);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissionIds(role.permissions.map((p) => p.id));
    setShowCreate(true);
  };

  const handleUpdate = async (data: RoleFormData) => {
    if (!selectedRole) return;
    await updateRole.mutateAsync({
      id: selectedRole.id,
      data: {
        name: data.name,
        description: data.description,
        permission_ids: selectedPermissionIds,
      },
    });
    setShowCreate(false);
    setSelectedRole(null);
    setSelectedPermissionIds([]);
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    try {
      await deleteRole.mutateAsync(selectedRole.id);
      toast.success('Role deleted successfully');
    } catch {
      toast.error('Failed to delete role');
    }
    setShowDelete(false);
    setSelectedRole(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Roles & Permissions</h1>
          <p className="text-foreground-secondary mt-1">Manage roles and their permissions</p>
        </div>
        <Button onClick={() => { setSelectedRole(null); setShowCreate(true); setSelectedPermissionIds([]); }}>
          <Plus className="mr-2 h-4 w-4" /> Create Role
        </Button>
      </div>

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>
        <TabsContent value="roles" className="pt-4">
          <RoleList
            data={roles}
            isLoading={isLoading}
            isError={isError}
            error={error}
            onRetry={() => refetch()}
            onEdit={handleEditRole}
            onDelete={(role) => {
              setSelectedRole(role);
              setShowDelete(true);
            }}
          />
        </TabsContent>
        <TabsContent value="permissions" className="pt-4">
          <PermissionGrid
            groups={permissionGroups}
            selectedIds={selectedPermissionIds}
            onChange={setSelectedPermissionIds}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) { setSelectedRole(null); setSelectedPermissionIds([]); } }}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
            <DialogDescription>Configure role details and permissions</DialogDescription>
          </DialogHeader>
          <RoleForm
            initialData={selectedRole ? { name: selectedRole.name, description: selectedRole.description } : undefined}
            onSubmit={selectedRole ? handleUpdate : handleCreate}
            isLoading={createRole.isPending || updateRole.isPending}
          />
          <Separator className="my-2" />
          <div>
            <h4 className="text-sm font-medium mb-3">Permissions</h4>
            <PermissionGrid
              groups={permissionGroups}
              selectedIds={selectedPermissionIds}
              onChange={setSelectedPermissionIds}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Role"
        description={`Are you sure you want to delete "${selectedRole?.name}"? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        loading={deleteRole.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
