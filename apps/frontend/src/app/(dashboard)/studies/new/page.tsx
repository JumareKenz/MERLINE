'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { StudyForm } from '@/components/studies/study-form';
import { useCreateStudy } from '@/hooks/use-studies';
import { useProjects } from '@/hooks/use-projects';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { useState } from 'react';
import type { StudyFormValues } from '@/components/studies/study-form';
import type { CreateStudyDto } from '@/types/study';
import { toast } from 'sonner';

export default function NewStudyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [projectId, setProjectId] = useState(searchParams.get('project_id') || '');
  const createStudy = useCreateStudy();
  const { data: projectsData, isLoading: projectsLoading, isError: projectsError, refetch: refetchProjects } = useProjects();
  const projects = projectsData?.data?.data || [];

  const handleSubmit = async (data: StudyFormValues) => {
    if (!projectId) {
      toast.error('Please select a project');
      return;
    }
    try {
      const result = await createStudy.mutateAsync({ projectId, data: data as unknown as CreateStudyDto });
      toast.success('Study created successfully');
      router.push(`/studies/${result.data.data.id}`);
    } catch {
      // handled by hook
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">New Study</h1>
        <p className="text-foreground-secondary mt-1">Create a new study within a project</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Study Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-6">
            <Label>Project *</Label>
            {projectsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : projectsError ? (
              <div className="flex items-center gap-2">
                <ErrorState message="Failed to load projects" onRetry={() => refetchProjects()} />
              </div>
            ) : (
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <SelectItem value="none" disabled>No projects available</SelectItem>
                  ) : (
                    projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
          <StudyForm onSubmit={handleSubmit} isSubmitting={createStudy.isPending} />
        </CardContent>
      </Card>
    </div>
  );
}
