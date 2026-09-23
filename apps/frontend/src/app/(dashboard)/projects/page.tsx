'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, AudioLines, FolderKanban, Plus, Quote, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { useResearchProjects } from '@/hooks/use-research-projects';
import { useSession } from '@/hooks/use-session';
import { API } from '@/lib/api-client';
import { cn, formatDate } from '@/lib/utils';
import { methodLabel } from '@/types/research-project';

/**
 * The workspace's starting point. Not an analytics wall: the projects, and
 * above them only work that is actually waiting on someone — each item a
 * real count from the API with a link to where it gets resolved.
 */
function NeedsAttention() {
  const session = useSession();
  const canInterviews = session.can('view.interviews');
  const canTranscripts = session.can('view.transcripts');
  const canFindings = session.can('view.findings');

  const interviews = useQuery({
    queryKey: ['attention', 'interviews'],
    queryFn: async () => (await API.interviews.list({ status: 'IN_PROGRESS' })).data.data,
    enabled: canInterviews,
  });
  const transcripts = useQuery({
    queryKey: ['attention', 'transcripts'],
    queryFn: async () => (await API.transcripts.listAll()).data.data,
    enabled: canTranscripts,
  });
  const findings = useQuery({
    queryKey: ['attention', 'findings'],
    queryFn: async () => (await API.findings.list()).data.data,
    enabled: canFindings,
  });

  const items = [
    {
      key: 'failed-transcripts',
      count: transcripts.data?.filter((t) => t.status === 'FAILED').length ?? 0,
      label: (n: number) => `${n} transcript${n === 1 ? '' : 's'} failed to process`,
      hint: 'Retry once the provider is available',
      href: '/transcripts?status=FAILED',
      icon: AlertTriangle,
      tone: 'error' as const,
    },
    {
      key: 'review',
      count: findings.data?.filter((f) => f.status === 'IN_REVIEW').length ?? 0,
      label: (n: number) => `${n} finding${n === 1 ? '' : 's'} awaiting review`,
      hint: 'Approve or return with evidence checked',
      href: '/findings?status=IN_REVIEW',
      icon: Quote,
      tone: 'warning' as const,
    },
    {
      key: 'no-audio',
      count: interviews.data?.filter((i) => (i._count?.recordings ?? 0) === 0).length ?? 0,
      label: (n: number) => `${n} interview${n === 1 ? '' : 's'} in progress with no audio yet`,
      hint: 'Field uploads may still be queued on a device',
      href: '/interviews?status=IN_PROGRESS',
      icon: AudioLines,
      tone: 'info' as const,
    },
  ].filter((i) => i.count > 0);

  const loading = interviews.isLoading || transcripts.isLoading || findings.isLoading;
  if (!session.isResolved || loading || items.length === 0) return null;

  return (
    <section aria-labelledby="attention-heading" className="mb-10">
      <h2 id="attention-heading" className="type-eyebrow mb-3">
        Needs attention
      </h2>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="group flex items-start gap-3 rounded-xl border border-border-subtle bg-background-elevated p-4 shadow-soft transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                item.tone === 'error' && 'bg-error-bg text-error',
                item.tone === 'warning' && 'bg-warning-bg text-warning',
                item.tone === 'info' && 'bg-info-bg text-info',
              )}
            >
              <item.icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold leading-snug text-foreground">{item.label(item.count)}</span>
              <span className="mt-0.5 block text-[13px] text-foreground-secondary">{item.hint}</span>
            </span>
            <ArrowRight className="mt-1 h-4 w-4 text-foreground-tertiary transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'active' | 'archived'>('active');
  const session = useSession();
  const { data, isLoading, isError, error, refetch } = useResearchProjects();

  const projects = useMemo(() => {
    const all = data?.items ?? [];
    const q = search.trim().toLowerCase();
    return all
      .filter((p) => (view === 'archived' ? p.status === 'archived' : p.status !== 'archived'))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q));
  }, [data, search, view]);

  const archivedCount = data?.items.filter((p) => p.status === 'archived').length ?? 0;
  const canCreate = !session.isResolved || session.can('create.projects');

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Each project holds its participants, interviews, transcripts and findings."
        actions={
          canCreate && (
            <Button asChild>
              <Link href="/projects/new">
                <Plus className="h-4 w-4" aria-hidden /> New project
              </Link>
            </Button>
          )
        }
      />

      <NeedsAttention />

      <section aria-label="Projects">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-tertiary" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects"
              aria-label="Search projects"
              className="pl-9"
            />
          </div>
          {archivedCount > 0 && (
            <div role="tablist" aria-label="Project status" className="inline-flex rounded-lg bg-background-inset p-1">
              {(['active', 'archived'] as const).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    'h-8 rounded-md px-3 text-[13px] font-medium capitalize transition-colors',
                    view === v ? 'bg-background-elevated text-foreground shadow-soft' : 'text-foreground-secondary hover:text-foreground',
                  )}
                >
                  {v}
                  {v === 'archived' && <span className="ml-1 text-foreground-tertiary">{archivedCount}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <LoadingState message="Loading projects" />
        ) : isError ? (
          <ErrorState message={(error as { message?: string })?.message} status={(error as { status?: number })?.status} onRetry={() => refetch()} />
        ) : (data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon={<FolderKanban />}
            title="Start your first project"
            description="A project is one study: its method, participants, interviews and the findings they support."
            action={
              canCreate && (
                <Button asChild>
                  <Link href="/projects/new">
                    <Plus className="h-4 w-4" aria-hidden /> New project
                  </Link>
                </Button>
              )
            }
          />
        ) : projects.length === 0 ? (
          <EmptyState size="inline" title="No projects match" description="Try a different search, or clear it to see every project." />
        ) : (
          <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-background-elevated shadow-soft">
            {projects.map((project) => {
              const counts = project._count;
              const method = methodLabel(project.settings?.method);
              return (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="group flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-background-hover focus-visible:bg-background-hover focus-visible:outline-none sm:flex-row sm:items-center sm:gap-6"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[15px] font-semibold text-foreground">{project.name}</span>
                        {project.status !== 'active' && <StatusBadge status={project.status} size="sm" />}
                      </div>
                      <p className="mt-1 truncate text-[13px] text-foreground-secondary">
                        {[method ?? 'Method not set', project.startDate && `from ${formatDate(project.startDate)}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    {counts && (
                      <dl className="flex shrink-0 gap-6 text-[13px]">
                        {[
                          ['Interviews', counts.interviews],
                          ['Participants', counts.participants],
                          ['Findings', counts.findings],
                        ].map(([label, value]) => (
                          <div key={label as string} className="min-w-[64px]">
                            <dt className="text-foreground-tertiary">{label}</dt>
                            <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    <ArrowRight className="hidden h-4 w-4 shrink-0 text-foreground-tertiary transition-transform group-hover:translate-x-0.5 sm:block" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
