'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Check, ClipboardList, Quote, Settings2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { InterviewTable } from '@/components/interviews/interview-table';
import { useResearchProject } from '@/hooks/use-research-projects';
import { useSession } from '@/hooks/use-session';
import { API } from '@/lib/api-client';
import { cn, formatDate } from '@/lib/utils';
import { methodLabel } from '@/types/research-project';

type Tab = 'interviews' | 'participants' | 'findings';

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const session = useSession();
  const [tab, setTab] = useState<Tab>('interviews');
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

  // Setup: each step is derived from real data, and links to where it's done.
  const steps = [
    { label: 'Interview method chosen', done: !!p.settings?.method, href: `/projects/${projectId}/settings` },
    { label: 'Participants registered', done: participantList.length > 0, href: '/participants/new' },
    { label: 'Interviews assigned', done: interviewList.length > 0, href: '/assignments/new' },
    { label: 'Audio collected', done: recorded > 0, href: '/interviews' },
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
                <Link href="/assignments/new">
                  <ClipboardList className="h-4 w-4" aria-hidden /> Assign interview
                </Link>
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
          <InterviewTable
            data={interviewList}
            isLoading={interviews.isLoading}
            isError={interviews.isError}
            error={interviews.error as { message?: string } | null}
            onRetry={() => interviews.refetch()}
            emptyDescription="Assign a consented participant to a field interviewer to begin collecting interviews for this project."
          />
        )}

        {tab === 'participants' &&
          (participants.isLoading ? (
            <LoadingState />
          ) : participantList.length === 0 ? (
            <EmptyState
              size="inline"
              icon={<UserRound />}
              title="No participants in this project"
              description="Register participants here or from the field app; consent is recorded per participant."
              action={
                <Button variant="secondary" asChild>
                  <Link href="/participants/new">Register participant</Link>
                </Button>
              }
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
    </div>
  );
}
