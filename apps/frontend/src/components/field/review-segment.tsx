'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Flag, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STANDARD_CUES, confidenceBand, cuesAreBalanced, formatClock, insertCue } from '@/lib/review';
import { cn } from '@/lib/utils';
import type { ReviewSegment, ReviewSegmentPatch } from '@/types/review';

const BAND_LABEL = { low: 'Low confidence', medium: 'Check', high: 'Good', unknown: '' } as const;

/**
 * One passage of the transcript, for the enumerator to check against the
 * recording: listen, correct the wording (keeping the speaker's own words),
 * fix the speaker, add non-verbal cues, and flag what cannot be made out.
 * Changes save when the field loses focus, or with the Save button.
 */
export function ReviewSegmentCard({
  segment,
  editable,
  speakers,
  active,
  onPlay,
  onSave,
}: {
  segment: ReviewSegment;
  editable: boolean;
  speakers: string[];
  active?: boolean;
  onPlay: (ms: number) => void;
  onSave: (segmentId: string, patch: ReviewSegmentPatch) => Promise<unknown>;
}) {
  const [text, setText] = useState(segment.text);
  const [speaker, setSpeaker] = useState(segment.speaker ?? '');
  const [flagged, setFlagged] = useState(segment.flagged);
  const [reason, setReason] = useState(segment.flagReason ?? '');
  const [note, setNote] = useState(segment.note ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [problem, setProblem] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const [showMachine, setShowMachine] = useState(false);
  const [noteOpen, setNoteOpen] = useState(!!segment.note);

  // Pick up the server's version when it changes underneath (e.g. after a rename).
  useEffect(() => {
    setText(segment.text);
    setSpeaker(segment.speaker ?? '');
    setFlagged(segment.flagged);
    setReason(segment.flagReason ?? '');
    setNote(segment.note ?? '');
  }, [segment.text, segment.speaker, segment.flagged, segment.flagReason, segment.note]);

  const dirty =
    text !== segment.text ||
    speaker !== (segment.speaker ?? '') ||
    flagged !== segment.flagged ||
    reason !== (segment.flagReason ?? '') ||
    note !== (segment.note ?? '');

  const save = async (over?: Partial<{ flagged: boolean }>) => {
    const next = { text, speaker, flagged, reason, note, ...over };
    if (!cuesAreBalanced(next.text)) {
      setProblem('Square brackets mark cues such as [pause]. Close every bracket, and do not nest them.');
      setState('error');
      return;
    }
    if (!next.text.trim()) {
      setProblem('A passage cannot be empty. Use [inaudible] if nothing can be made out.');
      setState('error');
      return;
    }
    setProblem(null);
    const patch: ReviewSegmentPatch = {};
    if (next.text !== segment.text) patch.text = next.text;
    if (next.speaker !== (segment.speaker ?? '')) patch.speakerLabel = next.speaker.trim() || null;
    if (next.flagged !== segment.flagged) patch.flagged = next.flagged;
    if (next.reason !== (segment.flagReason ?? '')) patch.flagReason = next.reason || null;
    if (next.note !== (segment.note ?? '')) patch.note = next.note || null;
    if (Object.keys(patch).length === 0) return;
    setState('saving');
    try {
      await onSave(segment.id, patch);
      setState('saved');
    } catch {
      setState('error');
      setProblem('This change was not saved. Check your connection and try again.');
    }
  };

  const band = confidenceBand(segment.confidence);

  return (
    <li
      id={`segment-${segment.index}`}
      className={cn(
        'rounded-2xl bg-field-card p-4 ring-1 transition-shadow',
        active ? 'ring-2 ring-lemon-600' : segment.flagged ? 'ring-warning' : 'ring-field-line',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPlay(segment.startMs)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-navy px-3 text-[13px] font-semibold tabular-nums text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lemon"
          aria-label={`Play from ${formatClock(segment.startMs)}`}
        >
          <Play className="h-3.5 w-3.5" aria-hidden /> {formatClock(segment.startMs)}
        </button>
        {band !== 'unknown' && band !== 'high' && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold',
              band === 'low' ? 'bg-error-bg text-error' : 'bg-warning-bg text-warning',
            )}
          >
            <AlertTriangle className="h-3 w-3" aria-hidden /> {BAND_LABEL[band]}
          </span>
        )}
        {segment.edited && <span className="rounded-full bg-lemon-100 px-2 py-0.5 text-[12px] font-semibold text-lemon-900">Edited</span>}
        <span className="ml-auto text-[12px] text-foreground-tertiary" role="status" aria-live="polite">
          {state === 'saving' && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Saving
            </span>
          )}
          {state === 'saved' && !dirty && (
            <span className="inline-flex items-center gap-1 text-success">
              <Check className="h-3 w-3" aria-hidden /> Saved
            </span>
          )}
        </span>
      </div>

      <div className="mt-3">
        <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-foreground-tertiary" htmlFor={`spk-${segment.index}`}>
          Speaker
        </label>
        <Input
          id={`spk-${segment.index}`}
          list={`spk-list-${segment.index}`}
          value={speaker}
          onChange={(e) => setSpeaker(e.target.value)}
          onBlur={() => dirty && editable && void save()}
          disabled={!editable}
          maxLength={60}
          placeholder="e.g. Interviewer, Respondent, Woman 2"
          className="mt-1 h-11"
        />
        <datalist id={`spk-list-${segment.index}`}>
          {speakers.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      <div className="mt-3">
        <label className="text-[12px] font-semibold uppercase tracking-[0.06em] text-foreground-tertiary" htmlFor={`txt-${segment.index}`}>
          What was said
        </label>
        <textarea
          id={`txt-${segment.index}`}
          ref={area}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => dirty && editable && void save()}
          disabled={!editable}
          rows={Math.min(8, Math.max(2, Math.ceil(text.length / 44)))}
          aria-invalid={state === 'error' && !!problem}
          aria-describedby={problem ? `err-${segment.index}` : undefined}
          className="mt-1 w-full resize-y rounded-xl border-0 bg-field-paper px-3 py-2.5 text-[16px] leading-relaxed text-foreground ring-1 ring-field-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
        />
        {problem && (
          <p id={`err-${segment.index}`} role="alert" className="mt-1 text-[13px] text-foreground-error">
            {problem}
          </p>
        )}
      </div>

      {editable && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Insert a non-verbal cue">
          {STANDARD_CUES.map((cue) => (
            <button
              key={cue}
              type="button"
              onClick={() => {
                const el = area.current;
                const start = el?.selectionStart ?? text.length;
                const end = el?.selectionEnd ?? text.length;
                const next = insertCue(text, cue, start, end);
                setText(next.text);
                requestAnimationFrame(() => {
                  el?.focus();
                  el?.setSelectionRange(next.caret, next.caret);
                });
              }}
              className="h-8 rounded-full bg-field-paper px-3 text-[13px] font-medium text-foreground ring-1 ring-field-line hover:bg-background-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              [{cue}]
            </button>
          ))}
        </div>
      )}

      <button type="button" onClick={() => setShowMachine((v) => !v)} className="mt-3 text-[13px] font-medium text-foreground-link hover:underline" aria-expanded={showMachine}>
        {showMachine ? 'Hide' : 'Show'} the machine transcript
      </button>
      {showMachine && (
        <p className="mt-1.5 rounded-lg bg-field-paper px-3 py-2 text-[14px] italic leading-relaxed text-foreground-secondary">
          {segment.machineText}
          {segment.machineSpeaker && <span className="not-italic text-foreground-tertiary"> — {segment.machineSpeaker}</span>}
        </p>
      )}

      <div className="mt-3 border-t border-field-line pt-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-[14px] font-medium text-foreground">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[hsl(var(--brand-navy))]"
              checked={flagged}
              disabled={!editable}
              onChange={(e) => {
                setFlagged(e.target.checked);
                if (editable) void save({ flagged: e.target.checked });
              }}
            />
            <Flag className="h-4 w-4 text-warning" aria-hidden /> Not sure / can&apos;t make it out
          </label>
        </div>
        {(flagged || noteOpen || note || reason) && (
          <div className="mt-2 grid gap-2">
            {flagged && (
              <Input
                aria-label="Why is this uncertain?"
                placeholder="What is unclear?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onBlur={() => dirty && editable && void save()}
                disabled={!editable}
                maxLength={300}
                className="h-11"
              />
            )}
            <Input
              aria-label="Note for the reviewer"
              placeholder="Note for the reviewer (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => dirty && editable && void save()}
              disabled={!editable}
              maxLength={1000}
              className="h-11"
            />
          </div>
        )}
        {editable && !flagged && !noteOpen && !note && (
          <button type="button" className="mt-1 text-[13px] font-medium text-foreground-link hover:underline" onClick={() => setNoteOpen(true)}>
            Add a note
          </button>
        )}
      </div>

      {editable && dirty && (
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={() => void save()} loading={state === 'saving'}>
            Save
          </Button>
        </div>
      )}
    </li>
  );
}
