'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { AudioPlayer, type AudioPlayerHandle } from '@/components/interviews/audio-player';
import { ReviewSegmentCard } from '@/components/field/review-segment';
import { ReviewStatusBadge } from '@/components/transcripts/review-status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { API } from '@/lib/api-client';
import {
  useFieldEditSegment,
  useFieldRenameSpeaker,
  useFieldSubmitReview,
  useFieldTranscript,
} from '@/hooks/use-transcript-review';
import { typeLabel } from '@/lib/interview-types';
import { confidenceBand } from '@/lib/review';
import { cn, formatDate } from '@/lib/utils';
import type { ReviewSegmentPatch } from '@/types/review';

export default function FieldReviewPage() {
  const { transcriptId } = useParams<{ transcriptId: string }>();
  const { data: t, isLoading, isError, refetch } = useFieldTranscript(transcriptId);
  const edit = useFieldEditSegment(transcriptId);
  const rename = useFieldRenameSpeaker(transcriptId);
  const submit = useFieldSubmitReview(transcriptId);
  const player = useRef<AudioPlayerHandle>(null);
  const [now, setNow] = useState(0);
  const [onlyCheck, setOnlyCheck] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const getUrl = useCallback(async () => (await API.fieldTranscripts.audio(transcriptId)).data.data.url, [transcriptId]);
  const speakers = useMemo(() => [...new Set((t?.segments ?? []).map((s) => s.speaker).filter((x): x is string => !!x))], [t?.segments]);
  const toCheck = useMemo(() => (t?.segments ?? []).filter((s) => s.flagged || confidenceBand(s.confidence) === 'low'), [t?.segments]);
  const flagged = (t?.segments ?? []).filter((s) => s.flagged).length;
  const activeIndex = useMemo(() => {
    const seg = (t?.segments ?? []).find((s) => now * 1000 >= s.startMs && now * 1000 < s.endMs);
    return seg?.index;
  }, [now, t?.segments]);

  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading transcript">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }
  if (isError || !t) {
    return (
      <div className="rounded-2xl bg-field-card p-6 text-center ring-1 ring-field-line" role="alert">
        <p className="text-[16px] font-semibold text-foreground">This transcript could not be opened.</p>
        <p className="mt-1 text-[14px] text-foreground-secondary">It may not be one of yours, or you may be offline.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/field/review">Back to transcripts</Link>
          </Button>
        </div>
      </div>
    );
  }

  const visible = onlyCheck ? t.segments.filter((s) => s.flagged || confidenceBand(s.confidence) === 'low') : t.segments;
  const save = (segmentId: string, patch: ReviewSegmentPatch) => edit.mutateAsync({ segmentId, patch });

  return (
    <div className="space-y-5 pb-24">
      <div>
        <Link href="/field/review" className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-[15px] font-medium text-foreground-secondary">
          <ArrowLeft className="h-5 w-5" aria-hidden /> Transcripts
        </Link>
        <h1 className="font-display text-[26px] font-semibold leading-tight tracking-[-0.02em] text-foreground">{t.interview.participant.displayName}</h1>
        <p className="mt-1 text-[14px] text-foreground-secondary">
          {typeLabel(t.interview.type)}
          {t.interview.project ? ` · ${t.interview.project.name}` : ''}
        </p>
        <div className="mt-2">
          <ReviewStatusBadge status={t.reviewStatus} />
        </div>
      </div>

      {t.reviewStatus === 'RETURNED_FOR_CORRECTION' && t.reviewNote && (
        <section aria-label="Feedback from the admin" className="rounded-2xl bg-warning-bg p-4">
          <h2 className="text-[15px] font-semibold text-foreground">Feedback from the admin</h2>
          <p className="mt-1 text-[15px] leading-snug text-foreground">{t.reviewNote}</p>
        </section>
      )}
      {(t.reviewStatus === 'SUBMITTED_FOR_ADMIN_REVIEW' || t.reviewStatus === 'APPROVED' || t.reviewStatus === 'LOCKED') && (
        <p className="rounded-2xl bg-field-card px-4 py-3 text-[15px] text-foreground-secondary ring-1 ring-field-line" role="status">
          {t.reviewStatus === 'SUBMITTED_FOR_ADMIN_REVIEW'
            ? 'You have submitted this. It is waiting for the admin, and you cannot change it unless it is returned to you.'
            : `Approved${t.approvedAt ? ` on ${formatDate(t.approvedAt)}` : ''}. This is the final version.`}
        </p>
      )}

      <div className="sticky top-14 z-10 -mx-1 rounded-2xl bg-field-paper/95 px-1 py-2 backdrop-blur">
        <AudioPlayer ref={player} interviewId={t.interview.id} mediaId={t.media.id} getUrl={getUrl} label="Recording" durationMs={t.durationMs ?? undefined} onTimeChange={setNow} />
      </div>

      {t.canEdit && (
        <div className="rounded-2xl bg-field-card p-4 text-[14px] leading-relaxed text-foreground-secondary ring-1 ring-field-line">
          <p>
            <span className="font-semibold text-foreground">Write what was said, not what was meant.</span> Keep repetitions, pauses, unfinished sentences and the
            language people used. Add cues like <span className="font-medium">[laughs]</span> or <span className="font-medium">[inaudible]</span>, and tick
            &ldquo;Not sure&rdquo; where you cannot tell.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] text-foreground-secondary" role="status">
          {t.segments.length} passages · {flagged} flagged · {toCheck.length} to check first
        </p>
        {toCheck.length > 0 && (
          <Button variant={onlyCheck ? 'default' : 'secondary'} size="sm" onClick={() => setOnlyCheck((v) => !v)} aria-pressed={onlyCheck}>
            {onlyCheck ? 'Show all passages' : 'Show passages to check first'}
          </Button>
        )}
      </div>

      {t.canEdit && speakers.length > 0 && (
        <form
          className="flex flex-wrap items-end gap-2 rounded-2xl bg-field-card p-3 ring-1 ring-field-line"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!from || !to.trim()) return;
            await rename.mutateAsync({ from, to: to.trim() }).catch(() => undefined);
            setTo('');
          }}
        >
          <div className="min-w-[8rem] flex-1">
            <label htmlFor="rn-from" className="text-[12px] font-semibold uppercase tracking-[0.06em] text-foreground-tertiary">
              Rename speaker
            </label>
            <select id="rn-from" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 h-11 w-full rounded-xl bg-field-paper px-3 text-[15px] ring-1 ring-field-line">
              <option value="">Choose…</option>
              {speakers.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[8rem] flex-1">
            <label htmlFor="rn-to" className="sr-only">
              New name
            </label>
            <Input id="rn-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="New name" className="h-11" maxLength={60} />
          </div>
          <Button type="submit" variant="secondary" disabled={!from || !to.trim()} loading={rename.isPending}>
            Rename
          </Button>
        </form>
      )}

      <ol className={cn('space-y-3')}>
        {visible.map((s) => (
          <ReviewSegmentCard key={s.id} segment={s} editable={t.canEdit} speakers={speakers} active={activeIndex === s.index} onPlay={(ms) => player.current?.seekTo(ms)} onSave={save} />
        ))}
      </ol>
      {visible.length === 0 && <p className="rounded-2xl bg-field-card p-4 text-center text-[15px] text-foreground-secondary ring-1 ring-field-line">Nothing to show.</p>}

      {t.history.length > 0 && (
        <section aria-label="History" className="rounded-2xl bg-field-card p-4 ring-1 ring-field-line">
          <h2 className="text-[15px] font-semibold text-foreground">History</h2>
          <ol className="mt-2 space-y-2 text-[14px] text-foreground-secondary">
            {t.history.map((h, i) => (
              <li key={i}>
                <span className="font-medium text-foreground">{h.action.replace(/_/g, ' ')}</span> · {formatDate(h.at)}
                {h.by ? ` · ${h.by}` : ''}
                {h.note ? <span className="block italic">“{h.note}”</span> : null}
              </li>
            ))}
          </ol>
        </section>
      )}

      {t.canEdit && (
        <div className="pb-safe fixed inset-x-0 bottom-[68px] z-10 border-t border-field-line bg-field-card/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <p className="hidden flex-1 text-[14px] text-foreground-secondary sm:block">Done checking? Send it for approval.</p>
            <Button size="lg" className="w-full sm:w-auto" onClick={() => setConfirm(true)}>
              <Send className="h-5 w-5" aria-hidden /> Submit for admin review
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Submit for admin review?"
        description={
          flagged > 0
            ? `${flagged} passage${flagged === 1 ? ' is' : 's are'} still marked as not sure. The admin will see that. After you submit, you cannot edit unless it is returned to you.`
            : 'After you submit, you cannot edit unless the admin returns it to you.'
        }
        confirmLabel="Submit"
        loading={submit.isPending}
        onConfirm={async () => {
          await submit.mutateAsync(note.trim() || undefined).catch(() => undefined);
          setConfirm(false);
          setNote('');
        }}
      />
    </div>
  );
}
