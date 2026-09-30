'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, History, Lock, RotateCcw, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { ReviewStatusBadge } from './review-status-badge';
import {
  useAdminReview,
  useApproveTranscript,
  useLockTranscript,
  useReopenTranscript,
  useRevisionComparison,
  useReturnTranscript,
} from '@/hooks/use-transcript-review';
import { useSession } from '@/hooks/use-session';
import { typeLabel } from '@/lib/interview-types';
import { formatClock, wordDiff } from '@/lib/review';
import { cn, formatDate } from '@/lib/utils';
import type { AdminReviewDetail, RevisionKind, SegmentDiff } from '@/types/review';

const KIND_LABEL: Record<RevisionKind, string> = {
  MACHINE: 'Machine transcript',
  ENUMERATOR: 'Enumerator’s version',
  ADMIN: 'Administrator’s corrections',
  APPROVED: 'Approved version',
};

const ACTION_LABEL: Record<string, string> = {
  transcript_available: 'Transcript ready for the enumerator',
  editing_started: 'Enumerator started editing',
  submitted_for_admin_review: 'Enumerator submitted for review',
  returned_for_correction: 'Returned to the enumerator',
  approved: 'Approved',
  approved_without_enumerator_review: 'Approved without the enumerator’s review',
  reopened: 'Reopened',
  locked: 'Locked',
};

function personName(p: { firstName: string; lastName: string } | null | undefined) {
  return p ? `${p.firstName} ${p.lastName}`.trim() : 'System';
}

function Diff({ d }: { d: SegmentDiff }) {
  return (
    <li className="border-t border-border-subtle px-4 py-3 first:border-t-0">
      <p className="mb-1 flex flex-wrap items-center gap-2 text-[12px] text-foreground-tertiary">
        <span className="font-medium tabular-nums text-foreground-secondary">
          #{d.index} · {formatClock(d.startMs)}
        </span>
        {d.changed.map((c) => (
          <span key={c} className="rounded bg-background-surface px-1.5 py-0.5">
            {c === 'text' ? 'wording' : c === 'speaker' ? 'speaker' : c === 'flag' ? 'flag' : 'note'}
          </span>
        ))}
      </p>
      {d.changed.includes('speaker') && (
        <p className="text-[13px] text-foreground-secondary">
          Speaker: <span className="line-through">{d.before?.speaker ?? '—'}</span> → <strong>{d.after?.speaker ?? '—'}</strong>
        </p>
      )}
      {d.changed.includes('text') && (
        <p className="text-[14.5px] leading-relaxed text-foreground">
          {wordDiff(d.before?.text ?? '', d.after?.text ?? '').map((w, i) => (
            <span
              key={i}
              className={cn(
                w.kind === 'removed' && 'bg-error-bg text-error line-through',
                w.kind === 'added' && 'bg-success-bg text-success',
              )}
            >
              {w.text}
            </span>
          ))}
        </p>
      )}
      {d.changed.includes('flag') && (
        <p className="text-[13px] text-foreground-secondary">
          Flag: {d.before?.flagged ? `“${d.before.flagReason ?? 'uncertain'}”` : 'none'} → {d.after?.flagged ? `“${d.after.flagReason ?? 'uncertain'}”` : 'none'}
        </p>
      )}
      {d.changed.includes('note') && d.after?.note && <p className="text-[13px] text-foreground-secondary">Note: {d.after.note}</p>}
    </li>
  );
}

function Versions({ review }: { review: AdminReviewDetail }) {
  const revs = review.revisions;
  const [from, setFrom] = useState<number | undefined>(undefined);
  const [to, setTo] = useState<number | undefined>(undefined);
  const cmp = useRevisionComparison(review.id, from, to, revs.length > 0);

  if (revs.length === 0) return <p className="text-[14px] text-foreground-secondary">No versions yet. The machine transcript is saved as the first version when transcription finishes.</p>;
  const opts = revs.map((r) => (
    <option key={r.id} value={r.number}>
      {r.number}. {KIND_LABEL[r.kind]} · {formatDate(r.createdAt)}
    </option>
  ));
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-[13px] text-foreground-secondary">
          Compare
          <NativeSelect value={from ?? revs[0].number} onChange={(e) => setFrom(Number(e.target.value))} className="mt-1">
            {opts}
          </NativeSelect>
        </label>
        <label className="text-[13px] text-foreground-secondary">
          with
          <NativeSelect value={to ?? revs[revs.length - 1].number} onChange={(e) => setTo(Number(e.target.value))} className="mt-1">
            {opts}
          </NativeSelect>
        </label>
      </div>
      <ol className="mt-3 space-y-1 text-[13px] text-foreground-secondary">
        {revs.map((r) => (
          <li key={r.id}>
            <span className="font-medium text-foreground">
              {r.number}. {KIND_LABEL[r.kind]}
            </span>{' '}
            · {formatDate(r.createdAt)}
            {r.author ? ` · ${personName(r.author)}` : ''}
            {r.note ? ` · “${r.note}”` : ''}
          </li>
        ))}
      </ol>
      <div className="mt-4" aria-live="polite">
        {cmp.isLoading ? (
          <LoadingState rows={2} />
        ) : cmp.isError ? (
          <ErrorState message="The comparison could not be loaded." onRetry={() => cmp.refetch()} />
        ) : cmp.data ? (
          <>
            <p className="mb-2 text-[13px] text-foreground-secondary">
              {cmp.data.changedSegments === 0
                ? `Version ${cmp.data.from.number} and version ${cmp.data.to.number} are identical.`
                : `${cmp.data.changedSegments} passage${cmp.data.changedSegments === 1 ? '' : 's'} differ between version ${cmp.data.from.number} and version ${cmp.data.to.number}.`}
            </p>
            {cmp.data.diffs.length > 0 && <ul className="overflow-hidden rounded-lg border border-border-subtle">{cmp.data.diffs.map((d) => <Diff key={d.index} d={d} />)}</ul>}
          </>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The administrator's gate. A transcript becomes evidence only when it is
 * approved here, after the enumerator's review. Reopening pulls it back out
 * of analysis until it is approved again.
 */
export function ReviewPanel({ transcriptId }: { transcriptId: string }) {
  const session = useSession();
  const canApprove = !session.isResolved || session.can('approve.transcripts');
  const query = useAdminReview(transcriptId);
  const approve = useApproveTranscript(transcriptId);
  const giveBack = useReturnTranscript(transcriptId);
  const reopen = useReopenTranscript(transcriptId);
  const lock = useLockTranscript(transcriptId);
  const [dialog, setDialog] = useState<null | 'approve' | 'return' | 'reopen'>(null);
  const [note, setNote] = useState('');
  const [ack, setAck] = useState(false);
  const [skip, setSkip] = useState(false);
  const [open, setOpen] = useState<'activity' | 'versions' | null>(null);

  const r = query.data;
  const flagged = useMemo(() => (r?.segments ?? []).filter((s) => s.flagged).length, [r?.segments]);
  const lowConfidence = useMemo(() => (r?.segments ?? []).filter((s) => s.confidence != null && s.confidence < 0.5 && !s.edited).length, [r?.segments]);

  if (query.isLoading) return <LoadingState rows={2} message="Loading review status" />;
  if (query.isError || !r) return <ErrorState message="The review status could not be loaded." onRetry={() => query.refetch()} />;

  const submitted = r.reviewStatus === 'SUBMITTED_FOR_ADMIN_REVIEW';
  const approvable = ['SUBMITTED_FOR_ADMIN_REVIEW', 'AVAILABLE_FOR_REVIEW', 'ENUMERATOR_EDITING', 'RETURNED_FOR_CORRECTION'].includes(r.reviewStatus);
  const close = () => {
    setDialog(null);
    setNote('');
    setAck(false);
    setSkip(false);
  };
  const approveBlocked =
    (flagged > 0 && !ack) || (!submitted && !skip) || (!submitted && skip && note.trim().length < 10);

  return (
    <section aria-labelledby="review-h" className="mb-6 rounded-xl border border-border-subtle bg-background-elevated p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="review-h" className="text-[15px] font-semibold text-foreground">
            Review and approval
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-foreground-secondary">
            <ReviewStatusBadge status={r.reviewStatus} />
            <span>{typeLabel(r.interview.type)}</span>
            {r.interview.enumeratorName && <span>· Enumerator: {r.interview.enumeratorName}</span>}
            {r.approvedAt && <span>· Approved {formatDate(r.approvedAt)}</span>}
          </p>
        </div>
        {canApprove && (
          <div className="flex flex-wrap gap-2">
            {approvable && (
              <Button onClick={() => setDialog('approve')}>
                <CheckCircle2 className="h-4 w-4" aria-hidden /> Approve
              </Button>
            )}
            {submitted && (
              <Button variant="secondary" onClick={() => setDialog('return')}>
                <Undo2 className="h-4 w-4" aria-hidden /> Return with feedback
              </Button>
            )}
            {r.reviewStatus === 'APPROVED' && (
              <>
                <Button variant="secondary" onClick={() => setDialog('reopen')}>
                  <RotateCcw className="h-4 w-4" aria-hidden /> Reopen
                </Button>
                <Button variant="secondary" loading={lock.isPending} onClick={() => lock.mutate()}>
                  <Lock className="h-4 w-4" aria-hidden /> Lock
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {r.reviewStatus === 'RETURNED_FOR_CORRECTION' && r.reviewNote && (
        <p className="mt-3 rounded-lg bg-warning-bg px-3 py-2.5 text-[13.5px] text-foreground">
          <strong>Returned with feedback:</strong> {r.reviewNote}
        </p>
      )}
      {!['APPROVED', 'LOCKED'].includes(r.reviewStatus) && (
        <p className="mt-3 rounded-lg bg-info-bg px-3 py-2.5 text-[13.5px] text-foreground">
          This transcript is not evidence yet. Quotations, findings, AI questions and reports can use it only after it is approved.
        </p>
      )}
      {(flagged > 0 || lowConfidence > 0) && (
        <p className="mt-3 text-[13.5px] text-foreground-secondary">
          Needs attention: {flagged > 0 && <strong>{flagged} flagged as uncertain</strong>}
          {flagged > 0 && lowConfidence > 0 && ' · '}
          {lowConfidence > 0 && <strong>{lowConfidence} low-confidence and uncorrected</strong>}. Use “Needs attention” below to go through them.
        </p>
      )}

      <div className="mt-4 flex gap-4 border-t border-border-subtle pt-3 text-[13px]">
        {(['activity', 'versions'] as const).map((k) => (
          <button key={k} type="button" aria-expanded={open === k} onClick={() => setOpen(open === k ? null : k)} className="inline-flex items-center gap-1 font-medium text-foreground-link hover:underline">
            <History className="h-3.5 w-3.5" aria-hidden /> {k === 'activity' ? `Activity (${r.events.length})` : `Versions and changes (${r.revisions.length})`}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open === k && 'rotate-180')} aria-hidden />
          </button>
        ))}
      </div>
      {open === 'activity' && (
        <ol className="mt-3 space-y-2 text-[13.5px]">
          {r.events.map((e) => (
            <li key={e.id}>
              <span className="font-medium text-foreground">{ACTION_LABEL[e.action] ?? e.action.replace(/_/g, ' ')}</span>
              <span className="text-foreground-tertiary">
                {' '}
                · {formatDate(e.createdAt)} · {personName(e.actor)}
              </span>
              {e.note && <span className="block text-foreground-secondary">“{e.note}”</span>}
            </li>
          ))}
          {r.events.length === 0 && <li className="text-foreground-secondary">Nothing recorded yet.</li>}
        </ol>
      )}
      {open === 'versions' && (
        <div className="mt-3">
          <Versions review={r} />
        </div>
      )}

      <Dialog open={dialog === 'approve'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve this transcript?</DialogTitle>
            <DialogDescription>
              The approved wording becomes the authoritative version for quotations, findings and reports. It is saved as a version that cannot be edited.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!submitted && (
              <label className="flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2.5 text-[13.5px]">
                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={skip} onChange={(e) => setSkip(e.target.checked)} />
                <span>
                  The enumerator has not submitted this. Approve without their review, and say why below (recorded in the history).
                </span>
              </label>
            )}
            {flagged > 0 && (
              <label className="flex items-start gap-2 rounded-lg bg-warning-bg px-3 py-2.5 text-[13.5px]">
                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                <span>
                  {flagged} passage{flagged === 1 ? ' is' : 's are'} still flagged as uncertain. I have listened, or accept that they stay unverified (they are never quoted).
                </span>
              </label>
            )}
            <label className="block text-[13.5px] font-medium text-foreground" htmlFor="approve-note">
              Note {submitted ? <span className="font-normal text-foreground-tertiary">(optional)</span> : <span className="font-normal text-foreground-tertiary">(required: at least 10 characters)</span>}
            </label>
            <Textarea id="approve-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000} />
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              loading={approve.isPending}
              disabled={approveBlocked}
              onClick={async () => {
                await approve.mutateAsync({ note: note.trim() || undefined, acknowledgeFlags: ack || undefined, skipEnumeratorReview: skip || undefined }).catch(() => undefined);
                close();
              }}
            >
              Approve transcript
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'return' || dialog === 'reopen'} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog === 'return' ? 'Return to the enumerator' : 'Reopen for correction'}</DialogTitle>
            <DialogDescription>
              {dialog === 'return'
                ? 'They see your note next to the transcript and can correct and resubmit it. Anything you changed stays changed.'
                : 'It stops counting as evidence until it is approved again. Reports already written keep their own record of what they used.'}
            </DialogDescription>
          </DialogHeader>
          <label className="block text-[13.5px] font-medium text-foreground" htmlFor="review-note">
            {dialog === 'return' ? 'What should they fix?' : 'Why is it being reopened?'}
          </label>
          <Textarea id="review-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000} autoFocus />
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              loading={giveBack.isPending || reopen.isPending}
              disabled={note.trim().length < 5}
              onClick={async () => {
                const run = dialog === 'return' ? giveBack : reopen;
                await run.mutateAsync(note.trim()).catch(() => undefined);
                close();
              }}
            >
              {dialog === 'return' ? 'Return transcript' : 'Reopen transcript'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
