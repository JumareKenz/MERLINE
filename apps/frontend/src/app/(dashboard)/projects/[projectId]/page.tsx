'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Check, ClipboardList, Quote, Settings2, Trash2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ProjectInterviewsFolder } from '@/components/projects/project-interviews-folder';
import { ProjectReportPanel } from '@/components/projects/project-report-panel';
import { ProjectAskPanel } from '@/components/projects/project-ask-panel';
import { useAnalysisReports } from '@/hooks/use-analysis-reports';
import { useAllTranscripts } from '@/hooks/use-transcripts';
import { FieldTeamPanel } from '@/components/field-team/field-team-panel';
import { useFieldTeam } from '@/hooks/use-field-team';
import { useResearchProject } from '@/hooks/use-research-projects';
import { useSession } from '@/hooks/use-session';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn, formatDate } from '@/lib/utils';
import { methodLabel } from '@/types/research-project';

type Tab = 'interviews' | 'report' | 'ask' | 'team' | 'participants' | 'findings';

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const session = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('interviews');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Transcripts and reports quote participants: administrators only.
  const showAnalysis = session.can('view.transcripts');
  const project = useResearchProject(projectId);

  const interviews = useQuery({
    queryKey: ['interviews', 'list', { projectId }],
    queryFn: async () => (await API.interviews.list({ projectId })).data.data,
    enabled: !!projectId,
  });
  const participants = useQuery({
    queryKey: ['participants', 'list', projectId],
    queryFn: async () => (await API.participants.list(projectId)).data.data,
    enabled: !!projectId,
  });
  const findings = useQuery({
    queryKey: ['findings', 'list', projectId],
    queryFn: async () => (await API.findings.list(projectId)).data.data,
    enabled: !!projectId && session.can('view.findings'),
  });

  const transcripts = useAllTranscripts(showAnalysis);
  const reports = useAnalysisReports({ projectId }, showAnalysis);

  const team = useFieldTeam();
  const teamOnProject = (team.data ?? []).filter((w) => w.projects.some((p) => p.id === projectId));

  if (project.isLoading) return <LoadingState message="Loading project" />;
  if (project.isError || !project.data) {
    const e = project.error as { message?: string; status?: number } | null;
    return <ErrorState message={e?.message ?? 'This project could not be found.'} status={e?.status ?? 404} onRetry={() => project.refetch()} />;
  }

  const p = project.data;
  const interviewList = interviews.data ?? [];
  const participantList = participants.data ?? [];
  const findingList = findings.data ?? [];
  const recorded = interviewList.filter((i) => (i._count?.recordings ?? 0) > 0).length;
  const interviewIds = new Set(interviewList.map((i) => i.id));
  const projectTranscripts = (transcripts.data ?? []).filter((t) => interviewIds.has(t.interviewId));
  const reportList = reports.data ?? [];
  const eligible = interviewList.filter(
    (i) =>
      i.consent?.allowAiAnalysis !== false &&
      !i.consent?.withdrawnAt &&
      projectTranscripts.some((t) => t.interviewId === i.id && t.status === 'COMPLETED' && (t._count?.segments ?? 1) > 0),
  ).length;

  // Setup: each step is derived from real data, and links to where it's done.
  const steps = [
    { label: 'Interview method chosen', done: !!p.settings?.method, href: `/projects/${projectId}/settings` },
    { label: 'Field team assigned', done: teamOnProject.length > 0, href: '/assignments' },
    { label: 'Interviews collected', done: interviewList.length > 0, href: '/interviews' },
    { label: 'Audio uploaded', done: recorded > 0, href: '/interviews' },
    { label: 'Findings drafted', done: findingList.length > 0, href: '/transcripts' },
  ];
  const nextStep = steps.find((s) => !s.done);

  return (
    <div>
      <PageHeader
        eyebrow={methodLabel(p.settings?.method) ?? 'Project'}
        title={p.name}
        meta={p.status !== 'active' ? <StatusBadge status={p.status} /> : undefined}
        description={p.description ?? undefined}
        actions={
          <>
            {session.can('edit.projects') && (
              <Button variant="ghost" asChild>
                <Link href={`/projects/${projectId}/settings`}>
                  <Settings2 className="h-4 w-4" aria-hidden /> Settings
                </Link>
              </Button>
            )}
            {session.can('create.interviews') && (
              <Button asChild>
                <Link href="/assignments">
                  <ClipboardList className="h-4 w-4" aria-hidden /> Field team
                </Link>
              </Button>
            )}
            {session.can('delete.projects') && (
              <Button variant="ghost" onClick={() => setConfirmDelete(true)} aria-label="Delete project">
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </>
        }
      />

      <section aria-label="Project setup" className="mb-10 rounded-xl border border-border-subtle bg-background-elevated p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="type-section">Progress</h2>
          <p className="text-[13px] text-foreground-tertiary">
            {p.startDate ? `Fieldwork ${formatDate(p.startDate)}${p.endDate ? ` – ${formatDate(p.endDate)}` : ''}` : 'No fieldwork dates set'}
          </p>
        </div>
        <ol className="grid gap-2 sm:grid-cols-5">
          {steps.map((step, i) => (
            <li key={step.label}>
              <Link
                href={step.href}
                className={cn(
                  'flex h-full items-start gap-2.5 rounded-lg border p-3 text-[13px] transition-colors hover:border-border-strong',
                  step === nextStep ? 'border-primary/40 bg-primary-50' : 'border-border-subtle',
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                    step.done ? 'bg-primary text-primary-foreground' : 'border border-border-strong text-foreground-tertiary',
                  )}
                  aria-hidden
                >
                  {step.done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                </span>
                <span className={step.done ? 'text-foreground' : 'text-foreground-secondary'}>
                  {step.label}
                  <span className="sr-only">{step.done ? ' — done' : ' — to do'}</span>
                  {step === nextStep && <span className="mt-0.5 block font-medium text-foreground-link">Next step</span>}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <div role="tablist" aria-label="Project records" className="mb-5 flex gap-6 border-b border-border-subtle">
        {(
          [
            ['interviews', `Interviews · ${interviewList.length}`],
            ...(showAnalysis
              ? [
                  ['report', 'Project report'],
                  ['ask', 'Ask AI'],
                ]
              : []),
            ['team', `Field team · ${teamOnProject.length}`],
            ['participants', `Participants · ${participantList.length}`],
            ...(session.can('view.findings') ? [['findings', `Findings · ${findingList.length}`]] : []),
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              '-mb-px h-11 border-b-2 text-[14px] font-medium transition-colors',
              tab === key ? 'border-primary text-foreground' : 'border-transparent text-foreground-secondary hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'interviews' && (
          <ProjectInterviewsFolder
            interviews={interviewList}
            isLoading={interviews.isLoading}
            transcripts={projectTranscripts}
            reports={reportList}
            showAnalysis={showAnalysis}
            canGenerate={session.can('create.reports') && session.can('use.ai')}
          />
        )}

        {tab === 'report' && showAnalysis && <ProjectReportPanel projectId={projectId} reports={reportList} eligibleInterviews={eligible} />}

        {tab === 'ask' && showAnalysis && <ProjectAskPanel projectId={projectId} />}

        {tab === 'team' && <FieldTeamPanel projectId={projectId} />}

        {tab === 'participants' &&
          (participants.isLoading ? (
            <LoadingState />
          ) : participantList.length === 0 ? (
            <EmptyState
              size="inline"
              icon={<UserRound />}
              title="No participants in this project"
              description="Field workers register participants and record their consent on site when they interview them."
            />
          ) : (
            <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-background-elevated shadow-soft">
              {participantList.map((person) => (
                <li key={person.id}>
                  <Link href={`/participants/${person.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-background-hover">
                    <span className="text-[14px] font-medium text-foreground">{person.displayName}</span>
                    <span className="text-[13px] text-foreground-tertiary">{person.externalRef ?? formatDate(person.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}

        {tab === 'findings' &&
          (findings.isLoading ? (
            <LoadingState />
          ) : findingList.length === 0 ? (
            <EmptyState size="inline" icon={<Quote />} title="No findings yet" description="Quote transcript segments from this project's interviews to build findings." />
          ) : (
            <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-background-elevated shadow-soft">
              {findingList.map((f) => (
                <li key={f.id}>
                  <Link href={`/findings/${f.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-background-hover">
                    <span className="min-w-0 truncate text-[14px] font-medium text-foreground">{f.title}</span>
                    <StatusBadge status={f.status} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          ))}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${p.name}”?`}
        description={`The project moves to the Trash with its ${interviewList.length} interview${interviewList.length === 1 ? '' : 's'}, ${participantList.length} participant${participantList.length === 1 ? '' : 's'} and its reports. Consent records are kept. An administrator can restore it all from Settings › Trash.`}
        confirmLabel="Delete project"
        variant="danger"
        loading={deleting}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await API.researchProjects.delete(projectId);
            router.push('/projects');
          } catch (e) {
            toast.error((e as { message?: string })?.message ?? 'The project could not be deleted');
          } finally {
            setDeleting(false);
            setConfirmDelete(false);
          }
        }}
      />
    </div>
  );
}
