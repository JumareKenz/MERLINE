'use client';

import { useRouter, useParams } from 'next/navigation';
import { useWorkspace } from '@/components/study-workspace/workspace-shell';
import { useProject } from '@/hooks/use-projects';
import { LogframeBuilder } from '@/components/logframe/logframe-builder';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function LogframeStep() {
  const { study, markStepComplete } = useWorkspace();
  const { studyId } = useParams<{ studyId: string }>();
  const router = useRouter();
  const projectId = study.project_id ?? study.projectId ?? '';
  const { data: projectData, isLoading } = useProject(projectId);
  const project = projectData?.data?.data;

  const proceed = () => {
    markStepComplete('logframe');
    router.push(`/studies/${studyId}/design/indicators`);
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="p-8">
        <p className="text-[13px] text-foreground-tertiary">This study is not linked to a project. The logframe is managed at the project level.</p>
        <Button size="sm" className="mt-4 h-8 text-[13px]" onClick={proceed}>
          Skip <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight">Logframe</h1>
        <p className="text-[13px] text-foreground-tertiary mt-0.5">
          Build your logical framework — the structured hierarchy linking activities to impact. This logframe belongs to the project and is shared across all studies.
        </p>
      </div>

      <LogframeBuilder projectId={projectId} projectName={project?.name ?? 'Project'} />

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button size="sm" variant="outline" className="h-8 text-[13px]" onClick={() => router.push(`/studies/${studyId}/design/toc`)}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Theory of Change
        </Button>
        <Button size="sm" className="h-8 text-[13px]" onClick={proceed}>
          Indicators <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
