'use client';

import { useParams } from 'next/navigation';
import { useProject } from '@/hooks/use-projects';
import { LogframeBuilder } from '@/components/logframe/logframe-builder';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';

export default function LogframePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data, isLoading, isError, error, refetch } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={error?.message} onRetry={() => refetch()} />;
  }

  const project = data?.data?.data;
  if (!project) return <ErrorState message="Project not found" />;

  return <LogframeBuilder projectId={projectId} projectName={project.name} />;
}
