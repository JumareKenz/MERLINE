'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Check, Languages, MessagesSquare, Pencil, Quote, Search, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { QuoteSegmentDialog } from '@/components/findings/quote-segment-dialog';
import { AudioPlayer, type AudioPlayerHandle } from '@/components/interviews/audio-player';
import { useEditSegment, useTranscript, useTranslateTranscript } from '@/hooks/use-transcripts';
import { useSession } from '@/hooks/use-session';
import { languageLabel } from '@/lib/languages';
import { cn, formatDuration } from '@/lib/utils';
import { segmentText, type TranscriptSegment } from '@/types/transcript';

/**
 * Below this the model was unsure of its own words: worth a listen.
 * Measured: clean English scores ~0.84; approximate Hausa ~0.55.
 */
const LOW_CONFIDENCE = 0.6;

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="rounded-sm bg-lemon-300 px-0.5 text-lemon-foreground">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function SegmentEditor({
  segment,
  saving,
  onSave,
  onCancel,
}: {
  segment: TranscriptSegment;
  saving: boolean;
  onSave: (text: string | null) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(segmentText(segment));
  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <label htmlFor={`edit-${segment.id}`} className="sr-only">
        Correct segment {segment.index}
      </label>
      <Textarea
        id={`edit-${segment.id}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={Math.min(8, Math.max(2, Math.ceil(draft.length / 80)))}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSave(draft);
        }}
        className="text-[15px] leading-[1.7]"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" loading={saving} onClick={() => onSave(draft)}>
          <Check className="h-3.5 w-3.5" aria-hidden /> Save correction
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {segment.editedText && (
          <Button size="sm" variant="ghost" onClick={() => onSave(null)} disabled={saving}>
            <Undo2 className="h-3.5 w-3.5" aria-hidden /> Restore machine text
          </Button>
        )}
        <span className="text-[12px] text-foreground-tertiary">The machine transcript is always kept.</span>
      </div>
    </div>
  );
}

/**
 * Reading surface for one transcript, with its recording. Segments keep
 * their index and timestamps visible because they are the unit of
 * evidence: every quotation, finding and AI Dialogue citation points back
 * to one of them. Clicking a segment plays the recording from there, and
 * the segment being played is highlighted.
 */
export default function TranscriptPage() {
  const { transcriptId } = useParams<{ transcriptId: string }>();
  const session = useSession();
  const { data, isLoading, isError, error, refetch } = useTranscript(transcriptId);
  const transcript = data?.data?.data;
  const editSegment = useEditSegment(transcriptId);
  const translate = useTranslateTranscript(transcriptId);
  const player = useRef<AudioPlayerHandle>(null);
  const [query, setQuery] = useState('');
  const [quoting, setQuoting] = useState<TranscriptSegment | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState<Set<string>>(new Set());
  const [showTranslation, setShowTranslation] = useState(true);
  const [follow, setFollow] = useState(true);
  const [positionMs, setPositionMs] = useState<number | null>(null);

  const segments = useMemo(() => transcript?.segments ?? [], [transcript]);
  const q = query.trim().toLowerCase();
  const visible = q
    ? segments.filter((s) => segmentText(s).toLowerCase().includes(q) || s.translatedText?.toLowerCase().includes(q))
    : segments;

  const activeId = useMemo(() => {
    if (positionMs === null) return null;
    return segments.find((s) => positionMs >= s.startMs && positionMs < Math.max(s.endMs, s.startMs + 1))?.id ?? null;
  }, [positionMs, segments]);

  // Keep the segment being played in view, unless someone is editing.
  useEffect(() => {
    if (!follow || !activeId || editing) return;
    const index = segments.find((s) => s.id === activeId)?.index;
    document.getElementById(`segment-${index}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeId, follow, editing, segments]);

  const playFrom = useCallback((segment: TranscriptSegment) => player.current?.seekTo(segment.startMs), []);

  if (isLoading) return <LoadingState message="Loading transcript" rows={6} />;
  if (isError || !transcript) {
    const e = error as { message?: string; status?: number } | null;
    return <ErrorState message={e?.message ?? 'This transcript could not be found.'} status={e?.status ?? 404} onRetry={() => refetch()} />;
  }

  const consent = transcript.interview?.consent;
  const active = !!consent && !consent.withdrawnAt;
  const canQuote = session.can('create.findings') && active && !!consent?.allowQuotation;
  const canAsk = session.can('use.ai') && active && !!consent?.allowAiAnalysis;
  const canEdit = session.can('edit.transcripts') && transcript.status === 'COMPLETED';
  const translating = transcript.translationStatus === 'PENDING' || transcript.translationStatus === 'PROCESSING';
  const hasTranslation = transcript.translationStatus === 'COMPLETED' && segments.some((s) => s.translatedText);
  const canTranslate =
    canEdit && canAsk && segments.length > 0 && transcript.language !== 'en' && !translating;
  const edits = segments.filter((s) => s.editedText).length;
  const lang = languageLabel(transcript.language);

  return (
    <div>
      <PageHeader
        eyebrow="Transcript"
        title={transcript.interview?.participant?.displayName ?? 'Transcript'}
        meta={<StatusBadge status={transcript.status} />}
        description={
          <>
            {[
              `${segments.length} segments`,
              lang,
              transcript.durationMs ? formatDuration(transcript.durationMs) : null,
              transcript.requestedLanguage ? null : 'language detected automatically',
              edits ? `${edits} corrected` : null,
            ]
              .filter(Boolean)
              .join(' · ')}{' '}
            ·{' '}
            <Link href={`/interviews/${transcript.interviewId}`} className="text-foreground-link hover:underline">
              View interview
            </Link>
          </>
        }
        actions={
          <>
            {canTranslate && (
              <Button variant="secondary" loading={translate.isPending} onClick={() => translate.mutate('en')}>
                <Languages className="h-4 w-4" aria-hidden /> {hasTranslation ? 'Translate again' : 'Translate to English'}
              </Button>
            )}
            {canAsk && (
              <Button variant="secondary" asChild>
                <Link href={`/ai?transcript=${transcript.id}`}>
                  <MessagesSquare className="h-4 w-4" aria-hidden /> Ask about this transcript
                </Link>
              </Button>
            )}
          </>
        }
      />

      {transcript.language === 'ha' && (
        <p className="mb-4 rounded-lg bg-info-bg px-4 py-3 text-[14px] text-foreground">
          Machine transcription of Hausa is approximate. Listen and correct segments before quoting them; segments marked
          “check” are the ones the model was least sure of.
        </p>
      )}
      {consent && !canQuote && session.can('create.findings') && (
        <p className="mb-4 rounded-lg bg-info-bg px-4 py-3 text-[14px] text-foreground">
          Quoting is unavailable: this participant&apos;s consent does not permit quotation{consent.withdrawnAt ? ' (withdrawn)' : ''}.
        </p>
      )}
      {translating && (
        <p className="mb-4 rounded-lg bg-background-surface px-4 py-3 text-[14px] text-foreground-secondary" role="status">
          Translating to {languageLabel(transcript.translationLanguage) ?? 'English'}…
          {transcript.translationError ? ` ${transcript.translationError}` : ''}
        </p>
      )}
      {transcript.translationStatus === 'FAILED' && (
        <p className="mb-4 rounded-lg bg-error-bg px-4 py-3 text-[14px] text-foreground" role="alert">
          Translation failed: {transcript.translationError}
        </p>
      )}

      <div className="sticky top-14 z-10 -mx-4 mb-4 space-y-2 bg-background/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:top-16 lg:-mx-8 lg:px-8">
        {transcript.media && session.can('view.recordings') && (
          <AudioPlayer
            ref={player}
            interviewId={transcript.interviewId}
            mediaId={transcript.media.id}
            label={transcript.media.originalName}
            durationMs={transcript.durationMs ?? transcript.media.metadata?.durationMs}
            onTimeChange={setPositionMs}
          />
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-tertiary" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this transcript" aria-label="Search this transcript" className="pl-9" />
          </div>
          <label className="inline-flex items-center gap-2 text-[13px] text-foreground-secondary">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--brand-navy))]" />
            Follow playback
          </label>
          {hasTranslation && (
            <label className="inline-flex items-center gap-2 text-[13px] text-foreground-secondary">
              <input
                type="checkbox"
                checked={showTranslation}
                onChange={(e) => setShowTranslation(e.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--brand-navy))]"
              />
              Show {languageLabel(transcript.translationLanguage) ?? 'English'} translation
            </label>
          )}
        </div>
        {q && (
          <p className="text-[13px] text-foreground-secondary" role="status">
            {visible.length} of {segments.length} segments match
          </p>
        )}
      </div>

      {transcript.status !== 'COMPLETED' ? (
        <EmptyState
          size="inline"
          title={transcript.status === 'FAILED' ? 'Transcription failed' : 'Transcribing'}
          description={
            transcript.status === 'FAILED'
              ? (transcript.errorMessage ?? 'Retry from the interview page.')
              : 'This page updates by itself when the transcript is ready. You can listen to the recording meanwhile.'
          }
        />
      ) : segments.length === 0 ? (
        <EmptyState size="inline" title="No speech detected" description="The recording appears to be silent, so there is nothing to transcribe." />
      ) : visible.length === 0 ? (
        <EmptyState size="inline" title="No matches" description="No segment contains that text." />
      ) : (
        <ol className="overflow-hidden rounded-xl border border-border-subtle bg-background-elevated shadow-soft">
          {visible.map((segment) => {
            const isActive = segment.id === activeId;
            const isEditing = editing === segment.id;
            const low = segment.confidence != null && segment.confidence < LOW_CONFIDENCE && !segment.editedText;
            const original = showOriginal.has(segment.id);
            return (
              <li
                key={segment.id}
                id={`segment-${segment.index}`}
                aria-current={isActive ? 'true' : undefined}
                onClick={(e) => {
                  // Clicking the text plays from here, unless the reader is selecting words.
                  if (isEditing || window.getSelection()?.toString()) return;
                  if ((e.target as HTMLElement).closest('button, a, textarea, input')) return;
                  playFrom(segment);
                }}
                className={cn(
                  'group grid cursor-pointer scroll-mt-48 target:bg-lemon-50 grid-cols-[64px_minmax(0,1fr)] gap-x-4 border-b border-border-subtle px-4 py-4 transition-colors last:border-b-0 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:px-5',
                  isActive ? 'bg-lemon-50 dark:bg-lemon-900/20' : 'hover:bg-background-surface',
                )}
              >
                <div className="pt-0.5 text-[13px] tabular-nums text-foreground-tertiary">
                  <button
                    type="button"
                    onClick={() => playFrom(segment)}
                    className="block rounded font-medium text-foreground-secondary hover:text-foreground-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Play from ${formatDuration(segment.startMs)}`}
                  >
                    {formatDuration(segment.startMs)}
                  </button>
                  <span className="block">#{segment.index}</span>
                </div>
                <div className="min-w-0">
                  {segment.speakerLabel && <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-foreground-tertiary">{segment.speakerLabel}</p>}
                  {isEditing ? (
                    <SegmentEditor
                      segment={segment}
                      saving={editSegment.isPending}
                      onCancel={() => setEditing(null)}
                      onSave={(text) =>
                        editSegment.mutate({ segmentId: segment.id, text }, { onSuccess: () => setEditing(null) })
                      }
                    />
                  ) : (
                    <>
                      <p className={cn('text-[15px] leading-[1.7] text-foreground', low && 'decoration-warning decoration-dotted underline-offset-4 [text-decoration-line:underline]')}>
                        <Highlight text={original ? segment.text : segmentText(segment)} query={q} />
                      </p>
                      {showTranslation && segment.translatedText && (
                        <p className="mt-1 text-[14px] italic leading-[1.6] text-foreground-secondary">
                          <span className="sr-only">Translation: </span>
                          <Highlight text={segment.translatedText} query={q} />
                        </p>
                      )}
                      {(segment.editedText || low) && (
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-foreground-tertiary">
                          {low && <span className="font-medium text-warning">Check: low model confidence</span>}
                          {segment.editedText && (
                            <>
                              <span>
                                Corrected
                                {segment.editedBy ? ` by ${segment.editedBy.firstName} ${segment.editedBy.lastName}` : ''}
                              </span>
                              <button
                                type="button"
                                className="font-medium text-foreground-link hover:underline"
                                onClick={() =>
                                  setShowOriginal((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(segment.id)) next.delete(segment.id);
                                    else next.add(segment.id);
                                    return next;
                                  })
                                }
                              >
                                {original ? 'Show correction' : 'Show machine text'}
                              </button>
                            </>
                          )}
                        </p>
                      )}
                    </>
                  )}
                </div>
                {!isEditing && (canEdit || canQuote) && (
                  <div className="col-start-2 mt-2 flex gap-1 sm:col-start-3 sm:mt-0 sm:flex-col sm:items-end">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                        onClick={() => setEditing(segment.id)}
                        aria-label={`Correct segment ${segment.index}`}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden /> Correct
                      </Button>
                    )}
                    {canQuote && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                        onClick={() => setQuoting(segment)}
                        aria-label={`Quote segment ${segment.index}`}
                      >
                        <Quote className="h-3.5 w-3.5" aria-hidden /> Quote
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {quoting && <QuoteSegmentDialog key={quoting.id} segment={quoting} open={!!quoting} onOpenChange={(open) => !open && setQuoting(null)} />}
    </div>
  );
}
