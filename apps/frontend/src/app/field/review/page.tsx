'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight, CheckCircle2, Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReviewStatusBadge } from '@/components/transcripts/review-status-badge';
import { useFieldTranscripts } from '@/hooks/use-transcript-review';
import { useFieldOutbox } from '@/stores/field-outbox-store';
import { typeLabel } from '@/lib/interview-types';
import { formatDuration } from '@/lib/utils';
import { NEEDS_ENUMERATOR, type FieldReviewListItem } from '@/types/review';

function Item({ t }: { t: FieldReviewListItem }) {
  return (
    <li>
      <Link href={`/field/review/${t.id}`} className="block rounded-2xl bg-field-card p-4 ring-1 ring-field-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[17px] font-semibold text-foreground">{t.interview.participant.displayName}</p>
            <p className="mt-0.5 text-[14px] text-foreground-secondary">
              {typeLabel(t.interview.type)}
              {t.interview.project ? ` · ${t.interview.project.name}` : ''}
              {t.durationMs ? ` · ${formatDuration(t.durationMs)}` : ''}
            </p>
          </div>
          <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-foreground-tertiary" aria-hidden />
        </div>
        <div className="mt-2.5">
          <ReviewStatusBadge status={t.reviewStatus} />
        </div>
        {t.reviewNote && (
          <p className="mt-3 rounded-xl bg-warning-bg px-3 py-2.5 text-[14px] leading-snug text-foreground">
            <span className="font-semibold">Feedback: </span>
            {t.reviewNote}
          </p>
        )}
      </Link>
    </li>
  );
}

function Group({ title, hint, icon, items }: { title: string; hint: string; icon: React.ReactNode; items: FieldReviewListItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="space-y-3">
      <div>
        <h2 className="flex items-center gap-2 text-[18px] font-semibold text-foreground">
          {icon}
          {title} <span className="text-foreground-tertiary">· {items.length}</span>
        </h2>
        <p className="text-[14px] text-foreground-secondary">{hint}</p>
      </div>
      <ul className="space-y-3">
        {items.map((t) => (
          <Item key={t.id} t={t} />
        ))}
      </ul>
    </section>
  );
}

/**
 * The enumerator's transcripts to check. Each is the machine transcript of
 * an interview they recorded: they listen, correct it, and submit it for
 * approval. Nothing here is used for analysis until an administrator has
 * approved it.
 */
export default function FieldReviewListPage() {
  const online = useFieldOutbox((s) => s.online);
  const { data, isLoading, isError, refetch } = useFieldTranscripts();
  const items = data ?? [];
  const todo = items.filter((t) => (NEEDS_ENUMERATOR as readonly string[]).includes(t.reviewStatus));
  const waiting = items.filter((t) => t.reviewStatus === 'SUBMITTED_FOR_ADMIN_REVIEW');
  const done = items.filter((t) => t.reviewStatus === 'APPROVED' || t.reviewStatus === 'LOCKED');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground">Transcripts</h1>
        <p className="mt-1 text-[15px] text-foreground-secondary">Check the written version of your interviews against the recording, then send it for approval.</p>
      </div>

      {!online && (
        <p className="rounded-2xl bg-navy px-4 py-3.5 text-[15px] text-white" role="status">
          Reviewing needs a connection so you can listen to the recording. Reconnect to continue.
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3" role="status" aria-label="Loading transcripts">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : isError ? (
        <div className="rounded-2xl bg-field-card p-6 text-center ring-1 ring-field-line" role="alert">
          <p className="text-[16px] font-semibold text-foreground">Your transcripts could not be loaded.</p>
          <Button className="mt-4" variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-field-card p-6 text-center ring-1 ring-field-line">
          <p className="text-[17px] font-semibold text-foreground">Nothing to review yet</p>
          <p className="mt-1 text-[15px] text-foreground-secondary">
            When a recording you submitted has been transcribed, it appears here. That usually takes a few minutes after it uploads.
          </p>
        </div>
      ) : (
        <>
          <Group title="To review" hint="Listen, correct, then submit." icon={<AlertCircle className="h-5 w-5 text-warning" aria-hidden />} items={todo} />
          <Group title="With the admin" hint="Submitted. You will see feedback here if it comes back." icon={<Hourglass className="h-5 w-5 text-foreground-tertiary" aria-hidden />} items={waiting} />
          <Group title="Approved" hint="Final. These are used for analysis." icon={<CheckCircle2 className="h-5 w-5 text-success" aria-hidden />} items={done} />
        </>
      )}
    </div>
  );
}
