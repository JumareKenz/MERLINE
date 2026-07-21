'use client';

import { useParams, useRouter } from 'next/navigation';
import { useProject, useUpdateProject, useArchiveProject } from '@/hooks/use-projects';
import { ProjectForm } from '@/components/projects/project-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { Separator } from '@/components/ui/separator';
import type { ProjectFormData } from '@/lib/validations';
import { toast } from 'sonner';

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useProject(projectId);
  const updateProject = useUpdateProject();
  const archiveProject = useArchiveProject();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={error?.message} onRetry={() => refetch()} />;
  }

  const project = data?.data?.data;
  if (!project) return <ErrorState message="Project not found" />;

  const handleUpdate = async (formData: ProjectFormData) => {
    try {
      await updateProject.mutateAsync({ id: projectId, data: formData });
      toast.success('Project updated successfully');
    } catch {
      // handled by hook
    }
  };

  const handleArchive = async () => {
    try {
      await archiveProject.mutateAsync(projectId);
      toast.success('Project archived');
      router.push('/projects');
    } catch {
      // handled by hook
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Project Settings</h1>
        <p className="text-foreground-secondary mt-1">Manage project configuration for &ldquo;{project.name}&rdquo;</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Update project details and metadata</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm
            project={project}
            onSubmit={handleUpdate}
            isSubmitting={updateProject.isPending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Irreversible actions for this project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Archive Project</p>
              <p className="text-xs text-foreground-secondary">Archive this project and all associated studies</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleArchive} loading={archiveProject.isPending}>
              Archive
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
