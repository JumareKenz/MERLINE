'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowRight, CheckCircle2, CloudOff, CloudUpload, FileClock, HardDrive, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RecordingRow } from '@/components/field/recording-row';
import { useSyncState } from '@/components/field/sync-status';
import { formatBytes } from '@/components/interviews/recording-player';
import { useFieldWork, type WorkItem } from '@/hooks/use-field-work';
import { useFieldOutbox } from '@/stores/field-outbox-store';
import { cn, formatDateTime } from '@/lib/utils';

type View = 'all' | 'drafts' | 'pending' | 'submitted';

function StateLabel({ item }: { item: WorkItem }) {
  if (item.needsAttention)
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-foreground-error">
        <AlertTriangle className="h-4 w-4" aria-hidden /> Needs attention
      </span>
    );
  if (item.pending)
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-foreground-warning">
        <CloudUpload className="h-4 w-4" aria-hidden />
        {item.notSynced ? 'Not sent yet' : `${item.unsentRecordings.length} recording${item.unsentRecordings.length === 1 ? '' : 's'} to send`}
      </span>
    );
  if (item.state === 'submitted')
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-success">
        <CheckCircle2 className="h-4 w-4" aria-hidden /> Submitted
      </span>
    );
  if (item.state === 'cancelled') return <span className="text-[13px] font-semibold text-foreground-tertiary">Cancelled</span>;
  if (item.state === 'booked') return <span className="text-[13px] font-semibold text-foreground-secondary">Booked</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-foreground-secondary">
      <FileClock className="h-4 w-4" aria-hidden /> Draft
    </span>
  );
}

/**
 * Everything this field worker has collected: drafts (started, not
 * submitted), pending (still only on this phone) and submitted. Upload
 * progress and retries live under Pending.
 */
function History() {
  const router = useRouter();
  const pathname = usePathname();
  const view = (useSearchParams().get('view') as View) || 'all';
  const { items, isLoading, source, savedAt } = useFieldWork();
  const { recordings, online, running, kick, storage, lastRunAt, available } = useFieldOutbox();
  const sync = useSyncState();

  const counts = {
    all: items.filter((i) => i.state !== 'booked').length,
    drafts: items.filter((i) => i.state === 'draft').length,
    pending: items.filter((i) => i.pending).length,
    submitted: items.filter((i) => i.state === 'submitted').length,
  };
  const shown = items.filter((i) =>
    view === 'drafts' ? i.state === 'draft' : view === 'pending' ? i.pending : view === 'submitted' ? i.state === 'submitted' : i.state !== 'booked',
  );
  // Recordings whose interview is not in the list (e.g. an old or reassigned interview).
  const orphanUnsent = recordings.filter((r) => r.status !== 'uploaded' && !items.some((i) => i.interview.id === r.interviewId));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground">History</h1>
        <p className="mt-1 text-[16px] text-foreground-secondary">{sync.label}</p>
      </header>

      <div role="tablist" aria-label="Filter interviews" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(
          [
            ['all', 'All'],
            ['drafts', 'Drafts'],
            ['pending', 'Pending'],
            ['submitted', 'Submitted'],
          ] as [View, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={view === key}
            onClick={() => router.replace(key === 'all' ? pathname : `${pathname}?view=${key}`)}
            className={cn(
              'h-11 shrink-0 rounded-full px-4 text-[15px] font-semibold ring-1 transition-colors',
              view === key ? 'bg-navy text-white ring-navy' : 'bg-field-card text-foreground ring-field-line',
            )}
          >
            {label} <span className={cn('tabular-nums', view === key ? 'text-lemon' : 'text-foreground-tertiary')}>{counts[key]}</span>
          </button>
        ))}
      </div>

      {source === 'cached' && (
        <p className="flex items-start gap-2.5 text-[14px] text-foreground-secondary">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Offline — server status as of {savedAt ? formatDateTime(savedAt) : 'your last connection'}.
        </p>
      )}

      {view === 'pending' && available && (
        <div className="flex items-center gap-3 rounded-2xl bg-navy px-4 py-4 text-white">
          {online ? <CloudUpload className="h-6 w-6 shrink-0 text-lemon" aria-hidden /> : <CloudOff className="h-6 w-6 shrink-0 text-lemon" aria-hidden />}
          <p className="flex-1 text-[15px] leading-snug">
            {online
              ? counts.pending > 0
                ? 'Sending in small parts. Keep Merline open to finish faster — progress is kept if you close it.'
                : 'Nothing waiting. New work sends by itself.'
              : 'No connection. Everything is safe on this phone and sends when you’re back online with the app open.'}
          </p>
          {online && counts.pending > 0 && (
            <Button variant="accent" onClick={() => kick()} loading={running} aria-label="Send now">
              {!running && <RefreshCw className="h-4 w-4" aria-hidden />} Now
            </Button>
          )}
        </div>
      )}

      {isLoading && items.length === 0 ? (
        <div className="space-y-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-2xl bg-field-card px-4 py-8 text-center text-[16px] text-foreground-secondary ring-1 ring-field-line">
          {view === 'drafts'
            ? 'No drafts. Interviews you start but haven’t submitted appear here.'
            : view === 'pending'
              ? 'Nothing waiting to send.'
              : view === 'submitted'
                ? 'Nothing submitted yet.'
                : 'No interviews yet. Start one from Projects.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((item) => (
            <li key={item.interview.id} className="overflow-hidden rounded-2xl bg-field-card ring-1 ring-field-line">
              <Link href={`/field/interview?id=${item.interview.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-background-hover">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold text-foreground">{item.interview.participantName ?? 'Participant'}</span>
                  <span className="block truncate text-[14px] text-foreground-secondary">
                    {[item.projectName, item.date ? formatDateTime(item.date) : null].filter(Boolean).join(' · ')}
                  </span>
                  <span className="mt-1 block">
                    <StateLabel item={item} />
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-foreground-tertiary" aria-hidden />
              </Link>
              {view === 'pending' && item.unsentRecordings.length > 0 && (
                <ul className="space-y-2 border-t border-field-line bg-field-paper/60 p-2">
                  {item.unsentRecordings.map((r) => (
                    <RecordingRow key={r.id} recording={r} compact />
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {view === 'pending' && orphanUnsent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">Other recordings on this phone</h2>
          <ul className="space-y-2">
            {orphanUnsent.map((r) => (
              <RecordingRow key={r.id} recording={r} />
            ))}
          </ul>
        </section>
      )}

      {view === 'pending' && (
        <footer className="space-y-1 text-[14px] text-foreground-tertiary">
          {storage && (
            <p className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" aria-hidden />
              {formatBytes(storage.usage)} used of {formatBytes(storage.quota)} available to Merline
              {storage.persisted ? ' · protected from automatic clean-up' : ''}
            </p>
          )}
          {lastRunAt && <p>Last checked {formatDateTime(lastRunAt)}</p>}
        </footer>
      )}
    </div>
  );
}

export default function FieldHistoryPage() {
  return (
    <Suspense>
      <History />
    </Suspense>
  );
}
