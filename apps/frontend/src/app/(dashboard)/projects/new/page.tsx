'use client';

import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { ResearchProjectForm } from '@/components/projects/research-project-form';
import { useCreateResearchProject } from '@/hooks/use-research-projects';

export default function NewProjectPage() {
  const router = useRouter();
  const create = useCreateResearchProject();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="New project"
        description="Name the study and choose its interview method. Participants, assignments and findings are added from the project once it exists."
      />
      <div className="rounded-xl border border-border-subtle bg-background-elevated p-5 shadow-soft sm:p-7">
        <ResearchProjectForm
          submitLabel="Create project"
          isSubmitting={create.isPending}
          onCancel={() => router.push('/projects')}
          onSubmit={async (data) => {
            const project = await create.mutateAsync(data).catch(() => null);
            if (project) router.push(`/projects/${project.id}`);
          }}
        />
      </div>
    </div>
  );
}
