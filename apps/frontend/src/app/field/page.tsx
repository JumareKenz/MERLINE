'use client';

import Link from 'next/link';
import { ArrowRight, CalendarClock, CloudOff, FolderOpen, MapPin, Mic, UploadCloud } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { useSyncState } from '@/components/field/sync-status';
import { useFieldWork, type WorkItem } from '@/hooks/use-field-work';
import { useAuthStore } from '@/stores/auth-store';
import { formatDateTime } from '@/lib/utils';

function WorkRow({ item, cta }: { item: WorkItem; cta: string }) {
  const i = item.interview;
  return (
    <li>
      <Link href={`/field/interview?id=${i.id}`} className="flex min-h-[64px] items-center gap-3 px-4 py-3 active:bg-background-hover">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-semibold text-foreground">{i.participantName ?? 'Participant'}</span>
          <span className="block truncate text-[14px] text-foreground-secondary">
            {[item.projectName, item.date ? formatDateTime(item.date) : null].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="shrink-0 text-[14px] font-semibold text-navy dark:text-lemon">{cta}</span>
        <ArrowRight className="h-5 w-5 shrink-0 text-foreground-tertiary" aria-hidden />
      </Link>
    </li>
  );
}

/**
 * The field worker's home: the projects they are assigned to (start an
 * interview in any of them), interviews they started but haven't
 * submitted, and anything booked for them in advance. History holds the rest.
 */
export default function FieldProjectsPage() {
  const user = useAuthStore((s) => s.user);
  const { items, projects, projectsLoading, source, savedAt, isLoading, isError, error, refetch } = useFieldWork();
  const sync = useSyncState();

  const drafts = items.filter((i) => i.state === 'draft');
  const booked = items
    .filter((i) => i.state === 'booked')
    .sort((a, b) => (a.interview.scheduledAt ?? '9999').localeCompare(b.interview.scheduledAt ?? '9999'));
  const countByProject = (id: string) => items.filter((i) => i.interview.projectId === id && i.state !== 'cancelled').length;

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-7">
      <header>
        <p className="text-[15px] font-medium text-foreground-secondary">{today}</p>
        <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
          {user?.firstName ? `Hello, ${user.firstName}` : 'Your projects'}
        </h1>
      </header>

      {source === 'cached' && (
        <div className="flex items-start gap-3 rounded-2xl bg-navy px-4 py-3.5 text-white" role="status">
          <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-lemon" aria-hidden />
          <p className="text-[15px] leading-snug">
            Offline — showing your work as of {savedAt ? formatDateTime(savedAt) : 'your last connection'}. You can still start and record interviews.
          </p>
        </div>
      )}

      {sync.pending > 0 && (
        <Link
          href="/field/history?view=pending"
          className="flex items-center gap-3 rounded-2xl border border-field-line bg-field-card px-4 py-3.5 shadow-soft"
        >
          <UploadCloud className="h-6 w-6 shrink-0 text-navy dark:text-lemon" aria-hidden />
          <span className="flex-1">
            <span className="block text-[16px] font-semibold text-foreground">{sync.pending} waiting to send</span>
            <span className="block text-[14px] text-foreground-secondary">{sync.label}</span>
          </span>
          <ArrowRight className="h-5 w-5 text-foreground-tertiary" aria-hidden />
        </Link>
      )}

      <section aria-labelledby="projects-heading">
        <h2 id="projects-heading" className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">
          Your projects
        </h2>
        {projectsLoading ? (
          <Skeleton className="h-28 rounded-2xl" />
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-field-line bg-field-card px-5 py-8 text-center">
            <FolderOpen className="mx-auto h-8 w-8 text-foreground-tertiary" aria-hidden />
            <p className="mt-3 text-[17px] font-semibold text-foreground">No projects assigned yet</p>
            <p className="mx-auto mt-1 max-w-xs text-[15px] text-foreground-secondary">
              Ask your research lead to add you to a project. It appears here the next time your phone connects.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => (
              <li key={p.id} className="overflow-hidden rounded-2xl bg-field-card shadow-soft ring-1 ring-field-line">
                <div className="px-4 pb-3 pt-4">
                  <p className="text-[18px] font-semibold leading-snug text-foreground">{p.name}</p>
                  <p className="mt-0.5 text-[14px] text-foreground-secondary">
                    {[p.method, `${countByProject(p.id)} interview${countByProject(p.id) === 1 ? '' : 's'} by you`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Link
                  href={`/field/new?project=${p.id}`}
                  className="flex h-control-field items-center gap-3 bg-lemon px-4 text-[17px] font-semibold text-lemon-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-navy/30"
                >
                  <Mic className="h-5 w-5" aria-hidden />
                  <span className="flex-1">Start an interview</span>
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isLoading ? (
        <Skeleton className="h-20 rounded-2xl" />
      ) : isError ? (
        <ErrorState
          message={(error as { message?: string } | null)?.message ?? 'Your interviews could not be loaded.'}
          status={(error as { status?: number } | null)?.status}
          onRetry={() => refetch()}
        />
      ) : (
        <>
          {drafts.length > 0 && (
            <section aria-labelledby="drafts-heading">
              <h2 id="drafts-heading" className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">
                Drafts · not submitted
              </h2>
              <ul className="divide-y divide-field-line overflow-hidden rounded-2xl bg-field-card ring-1 ring-field-line">
                {drafts.slice(0, 5).map((item) => (
                  <WorkRow key={item.interview.id} item={item} cta="Continue" />
                ))}
              </ul>
              {drafts.length > 5 && (
                <Link href="/field/history?view=drafts" className="mt-2 inline-block text-[15px] font-medium text-foreground-link">
                  All {drafts.length} drafts
                </Link>
              )}
            </section>
          )}

          {booked.length > 0 && (
            <section aria-labelledby="booked-heading">
              <h2 id="booked-heading" className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">
                Booked for you
              </h2>
              <ul className="divide-y divide-field-line overflow-hidden rounded-2xl bg-field-card ring-1 ring-field-line">
                {booked.map((item) => (
                  <li key={item.interview.id}>
                    <Link
                      href={`/field/interview?id=${item.interview.id}`}
                      className="flex min-h-[64px] items-center gap-3 px-4 py-3 active:bg-background-hover"
                      aria-label={`Prepare interview with ${item.interview.participantName ?? 'participant'}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px] font-semibold text-foreground">{item.interview.participantName ?? 'Participant'}</span>
                        <span className="flex flex-wrap items-center gap-x-3 text-[14px] text-foreground-secondary">
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-4 w-4" aria-hidden />
                            {item.interview.scheduledAt ? formatDateTime(item.interview.scheduledAt) : 'No time set'}
                          </span>
                          {item.interview.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-4 w-4" aria-hidden /> {item.interview.location}
                            </span>
                          )}
                        </span>
                      </span>
                      <ArrowRight className="h-5 w-5 shrink-0 text-foreground-tertiary" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
