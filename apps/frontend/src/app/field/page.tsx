'use client';

import Link from 'next/link';
import { ArrowRight, CalendarClock, CloudOff, MapPin, Plus, ShieldCheck, ShieldOff, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { useSyncState } from '@/components/field/sync-status';
import { consentPermitsRecording, useFieldInterviews } from '@/hooks/use-field-interviews';
import { useAuthStore } from '@/stores/auth-store';
import type { CachedInterview } from '@/lib/field/types';
import { cn, formatDateTime } from '@/lib/utils';

function interviewHref(id: string) {
  return `/field/interview?id=${id}`;
}

function timeLabel(i: CachedInterview) {
  if (i.status === 'IN_PROGRESS') return 'In progress';
  if (!i.scheduledAt) return 'No time set';
  return formatDateTime(i.scheduledAt);
}

function ConsentChip({ consent }: { consent: CachedInterview['consent'] }) {
  const ok = consentPermitsRecording(consent);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium',
        ok ? 'bg-lemon-100 text-lemon-900' : 'bg-neutral-150 text-foreground-secondary',
      )}
    >
      {ok ? <ShieldCheck className="h-4 w-4" aria-hidden /> : <ShieldOff className="h-4 w-4" aria-hidden />}
      {ok ? 'Recording consented' : consent?.withdrawnAt ? 'Consent withdrawn' : 'No recording consent'}
    </span>
  );
}

/**
 * Today: the next interview, what else is assigned, and whether anything
 * recorded on this device is still waiting to upload. Nothing else.
 */
export default function FieldTodayPage() {
  const user = useAuthStore((s) => s.user);
  const { interviews, source, savedAt, isLoading, isError, error, refetch } = useFieldInterviews();
  const sync = useSyncState();

  const open = interviews
    .filter((i) => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'IN_PROGRESS' ? -1 : 1;
      return (a.scheduledAt ?? '9999').localeCompare(b.scheduledAt ?? '9999');
    });
  const [next, ...rest] = open;
  const done = interviews.filter((i) => i.status === 'COMPLETED').length;

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-7">
      <header>
        <p className="text-[15px] font-medium text-foreground-secondary">{today}</p>
        <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
          {user?.firstName ? `Hello, ${user.firstName}` : 'Today'}
        </h1>
      </header>

      {source === 'cached' && (
        <div className="flex items-start gap-3 rounded-2xl bg-navy px-4 py-3.5 text-white" role="status">
          <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-lemon" aria-hidden />
          <p className="text-[15px] leading-snug">
            Offline — showing your interviews as of {savedAt ? formatDateTime(savedAt) : 'your last connection'}. You can still record; audio stays on
            this phone until it can upload.
          </p>
        </div>
      )}

      {sync.pending > 0 && (
        <Link
          href="/field/uploads"
          className="flex items-center gap-3 rounded-2xl border border-field-line bg-field-card px-4 py-3.5 shadow-soft"
        >
          <UploadCloud className="h-6 w-6 shrink-0 text-navy dark:text-lemon" aria-hidden />
          <span className="flex-1">
            <span className="block text-[16px] font-semibold text-foreground">
              {sync.pending} recording{sync.pending === 1 ? '' : 's'} on this phone
            </span>
            <span className="block text-[14px] text-foreground-secondary">{sync.label}</span>
          </span>
          <ArrowRight className="h-5 w-5 text-foreground-tertiary" aria-hidden />
        </Link>
      )}

      {isLoading ? (
        <div className="space-y-3" aria-label="Loading interviews">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : isError ? (
        <ErrorState
          message={(error as { message?: string } | null)?.message ?? 'Your interviews could not be loaded.'}
          status={(error as { status?: number } | null)?.status}
          onRetry={() => refetch()}
        />
      ) : !next ? (
        <section className="rounded-2xl border border-dashed border-field-line bg-field-card px-5 py-10 text-center">
          <h2 className="text-[19px] font-semibold text-foreground">No interviews waiting</h2>
          <p className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-foreground-secondary">
            {done > 0 ? `You've completed ${done}. ` : ''}New assignments from your research lead appear here when your phone is online.
          </p>
          <Button variant="secondary" size="lg" className="mt-6" asChild>
            <Link href="/field/participants/new">
              <Plus className="h-5 w-5" aria-hidden /> Register a participant
            </Link>
          </Button>
        </section>
      ) : (
        <>
          <section aria-labelledby="next-heading">
            <h2 id="next-heading" className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">
              {next.status === 'IN_PROGRESS' ? 'Continue' : 'Up next'}
            </h2>
            <div className="overflow-hidden rounded-2xl bg-field-card shadow-float ring-1 ring-field-line">
              <div className="space-y-3 p-5">
                <p className="text-[24px] font-semibold leading-tight tracking-[-0.01em] text-foreground">{next.participantName ?? 'Participant'}</p>
                <div className="space-y-1.5 text-[15px] text-foreground-secondary">
                  <p className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 shrink-0" aria-hidden /> {timeLabel(next)}
                  </p>
                  {next.location && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 shrink-0" aria-hidden /> {next.location}
                    </p>
                  )}
                </div>
                <ConsentChip consent={next.consent} />
              </div>
              <Link
                href={interviewHref(next.id)}
                className="flex h-control-field items-center justify-between bg-navy px-5 text-[17px] font-semibold text-white transition-colors hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-lemon"
              >
                {next.status === 'IN_PROGRESS' ? 'Continue interview' : 'Prepare interview'}
                <ArrowRight className="h-5 w-5 text-lemon" aria-hidden />
              </Link>
            </div>
          </section>

          {rest.length > 0 && (
            <section aria-labelledby="later-heading">
              <h2 id="later-heading" className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">
                Also assigned · {rest.length}
              </h2>
              <ul className="divide-y divide-field-line overflow-hidden rounded-2xl bg-field-card ring-1 ring-field-line">
                {rest.map((i) => (
                  <li key={i.id}>
                    <Link href={interviewHref(i.id)} className="flex min-h-[64px] items-center gap-3 px-4 py-3 active:bg-background-hover">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px] font-semibold text-foreground">{i.participantName ?? 'Participant'}</span>
                        <span className="block truncate text-[14px] text-foreground-secondary">
                          {timeLabel(i)}
                          {i.location ? ` · ${i.location}` : ''}
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

      {!isLoading && done > 0 && next && (
        <p className="text-center text-[14px] text-foreground-tertiary">
          {done} interview{done === 1 ? '' : 's'} completed
        </p>
      )}
    </div>
  );
}
