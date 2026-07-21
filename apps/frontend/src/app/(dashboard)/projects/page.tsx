'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProjectTable } from '@/components/projects/project-table';
import { ProjectForm } from '@/components/projects/project-form';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useProjects, useCreateProject, useDeleteProject, useArchiveProject } from '@/hooks/use-projects';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { Project } from '@/types/project';
import type { ProjectFormData } from '@/lib/validations';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const { data, isLoading, isError, error, refetch } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const archiveProject = useArchiveProject();

  const projects = data?.data?.data || [];

  const handleCreate = async (formData: ProjectFormData) => {
    await createProject.mutateAsync(formData);
    setShowCreate(false);
  };

  const handleDelete = async () => {
    if (!selectedProject) return;
    try {
      await deleteProject.mutateAsync(selectedProject.id);
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete project');
    }
    setShowDelete(false);
    setSelectedProject(null);
  };

  const handleArchive = async (project: Project) => {
    try {
      await archiveProject.mutateAsync(project.id);
    } catch {
      // handled by hook
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-foreground-secondary mt-1">Manage your evaluation and research projects</p>
        </div>
        <Link href="/projects/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
        </Link>
      </div>

      <ProjectTable
        data={projects}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
        onDelete={(id) => { const p = projects.find((x) => x.id === id); if (p) { setSelectedProject(p); setShowDelete(true); } }}
      />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Project"
        description={`Are you sure you want to delete "${selectedProject?.name}"? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        loading={deleteProject.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
