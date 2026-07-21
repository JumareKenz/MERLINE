'use client';

import { useRouter } from 'next/navigation';
import { ProjectForm } from '@/components/projects/project-form';
import { useCreateProject } from '@/hooks/use-projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProjectFormData } from '@/lib/validations';
import { toast } from 'sonner';

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();

  const handleSubmit = async (data: ProjectFormData) => {
    try {
      const result = await createProject.mutateAsync(data);
      toast.success('Project created successfully');
      router.push(`/projects/${result.data.data.id}`);
    } catch {
      // handled by hook
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">New Project</h1>
        <p className="text-foreground-secondary mt-1">Create a new evaluation or research project</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm onSubmit={handleSubmit} isSubmitting={createProject.isPending} />
        </CardContent>
      </Card>
    </div>
  );
}
