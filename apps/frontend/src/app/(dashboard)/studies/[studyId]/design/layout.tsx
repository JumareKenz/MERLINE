'use client';

import { useParams } from 'next/navigation';
import { useStudy } from '@/hooks/use-studies';
import { WorkspaceShell } from '@/components/study-workspace/workspace-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';

function extractStep(pathname: string): string {
  const parts = pathname.split('/');
  const designIdx = parts.findIndex((p) => p === 'design');
  return designIdx >= 0 && parts[designIdx + 1] ? parts[designIdx + 1] : 'overview';
}

export default function StudyDesignLayout({ children }: { children: React.ReactNode }) {
  const { studyId } = useParams<{ studyId: string }>();
  const { data, isLoading, isError, error, refetch } = useStudy(studyId);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-48px)]">
        <div className="w-[220px] border-r border-border bg-background-subtle p-4 space-y-3">
          {[1,2,3,4,5,6,7,8].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
        <div className="flex-1 p-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <ErrorState message={error?.message} onRetry={() => refetch()} />
      </div>
    );
  }

  const study = data?.data?.data;
  if (!study) return <ErrorState message="Study not found" />;

  const currentStep = typeof window !== 'undefined'
    ? extractStep(window.location.pathname)
    : 'overview';

  return (
    <WorkspaceShell study={study} currentStep={currentStep}>
      {children}
    </WorkspaceShell>
  );
}
