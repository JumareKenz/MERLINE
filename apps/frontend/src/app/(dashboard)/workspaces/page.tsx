'use client';

import { useState } from 'react';
import { WorkspaceList } from '@/components/workspaces/workspace-list';
import { WorkspaceForm } from '@/components/workspaces/workspace-form';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useWorkspaces, useCreateWorkspace, useUpdateWorkspace, useDeleteWorkspace, useSetDefaultWorkspace } from '@/hooks/use-workspaces';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { Workspace } from '@/types/workspace';
import type { WorkspaceFormData } from '@/lib/validations';
import { toast } from 'sonner';

export default function WorkspacesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

  const { data, isLoading, isError, error, refetch } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();
  const setDefault = useSetDefaultWorkspace();

  const workspaces = data?.data?.data || [];

  const handleCreate = async (formData: WorkspaceFormData) => {
    await createWorkspace.mutateAsync(formData);
    setShowCreate(false);
  };

  const handleEdit = async (formData: WorkspaceFormData) => {
    if (!selectedWorkspace) return;
    await updateWorkspace.mutateAsync({ id: selectedWorkspace.id, data: formData });
    setShowCreate(false);
    setSelectedWorkspace(null);
  };

  const handleDelete = async () => {
    if (!selectedWorkspace) return;
    try {
      await deleteWorkspace.mutateAsync(selectedWorkspace.id);
      toast.success('Workspace deleted');
    } catch {
      toast.error('Failed to delete workspace');
    }
    setShowDelete(false);
    setSelectedWorkspace(null);
  };

  const handleSetDefault = async (workspace: Workspace) => {
    try {
      await setDefault.mutateAsync(workspace.id);
    } catch {
      // handled by hook
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Workspaces</h1>
          <p className="text-foreground-secondary mt-1">Organize your work into workspaces</p>
        </div>
        <Button onClick={() => { setSelectedWorkspace(null); setShowCreate(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Create Workspace
        </Button>
      </div>

      <WorkspaceList
        data={workspaces}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        onEdit={(ws) => { setSelectedWorkspace(ws); setShowCreate(true); }}
        onDelete={(ws) => { setSelectedWorkspace(ws); setShowDelete(true); }}
        onSetDefault={handleSetDefault}
      />

      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) setSelectedWorkspace(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedWorkspace ? 'Edit Workspace' : 'Create Workspace'}</DialogTitle>
          </DialogHeader>
          <WorkspaceForm
            initialData={selectedWorkspace ? { name: selectedWorkspace.name, description: selectedWorkspace.description, is_default: selectedWorkspace.is_default } : undefined}
            onSubmit={selectedWorkspace ? handleEdit : handleCreate}
            isLoading={createWorkspace.isPending || updateWorkspace.isPending}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Workspace"
        description={`Are you sure you want to delete "${selectedWorkspace?.name}"? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        loading={deleteWorkspace.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
