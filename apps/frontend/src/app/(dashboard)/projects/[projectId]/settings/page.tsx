'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Archive } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ResearchProjectForm } from '@/components/projects/research-project-form';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { useArchiveResearchProject, useResearchProject, useUpdateResearchProject } from '@/hooks/use-research-projects';
import { useSession } from '@/hooks/use-session';

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const session = useSession();
  const { data: project, isLoading, isError, error, refetch } = useResearchProject(projectId);
  const update = useUpdateResearchProject(projectId);
  const archive = useArchiveResearchProject();
  const [confirmArchive, setConfirmArchive] = useState(false);

  if (isLoading) return <LoadingState message="Loading project" />;
  if (isError || !project) {
    const e = error as { message?: string; status?: number } | null;
    return <ErrorState message={e?.message ?? 'This project could not be found.'} status={e?.status ?? 404} onRetry={() => refetch()} />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Project settings" description={project.name} />
      <div className="rounded-xl border border-border-subtle bg-background-elevated p-5 shadow-soft sm:p-7">
        <ResearchProjectForm
          initial={project}
          submitLabel="Save changes"
          isSubmitting={update.isPending}
          onCancel={() => router.push(`/projects/${projectId}`)}
          onSubmit={async (data) => {
            await update.mutateAsync(data).catch(() => undefined);
          }}
        />
      </div>

      {project.status !== 'archived' && (!session.isResolved || session.can('edit.projects')) && (
        <section className="mt-8 rounded-xl border border-border-subtle p-5 sm:p-6">
          <h2 className="type-section">Archive project</h2>
          <p className="mt-1 text-[14px] text-foreground-secondary">
            Archiving hides the project from the active list. Interviews, transcripts and findings are kept and it can be restored.
          </p>
          <Button variant="secondary" className="mt-4" onClick={() => setConfirmArchive(true)}>
            <Archive className="h-4 w-4" aria-hidden /> Archive project
          </Button>
        </section>
      )}

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title={`Archive “${project.name}”?`}
        description="It will move to the Archived list. Nothing is deleted."
        confirmLabel="Archive"
        loading={archive.isPending}
        onConfirm={async () => {
          await archive.mutateAsync(projectId).catch(() => undefined);
          setConfirmArchive(false);
          router.push('/projects');
        }}
      />
    </div>
  );
}
