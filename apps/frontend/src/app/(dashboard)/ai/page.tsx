'use client';

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ArrowUpRight, FileText, Info, MessagesSquare, SearchX, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { useAllTranscripts } from '@/hooks/use-transcripts';
import { API } from '@/lib/api-client';
import { formatDuration } from '@/lib/utils';
import type { DialogueAnswer } from '@/types/transcript';

type Entry =
  | { id: number; status: 'pending'; question: string }
  | { id: number; status: 'answered'; question: string; result: DialogueAnswer }
  | { id: number; status: 'failed'; question: string; error: string };

const STARTERS = [
  'What barriers does the participant describe?',
  'What does the participant say about cost?',
  'Where does the participant express trust or distrust?',
];

function AnswerCard({ entry, transcriptId }: { entry: Entry; transcriptId: string }) {
  return (
    <article className="animate-rise-in rounded-xl border border-border-subtle bg-background-elevated shadow-soft" aria-busy={entry.status === 'pending'}>
      <header className="border-b border-border-subtle px-5 py-4">
        <p className="type-eyebrow mb-1.5">Question</p>
        <h3 className="text-[15px] font-semibold leading-snug text-foreground">{entry.question}</h3>
      </header>
      <div className="px-5 py-4">
        {entry.status === 'pending' && <LoadingState message="Reading the transcript" rows={2} />}

        {entry.status === 'failed' && (
          <p className="flex items-start gap-2 text-[14px] text-foreground-error" role="alert">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {entry.error}
          </p>
        )}

        {entry.status === 'answered' && entry.result.insufficientEvidence && (
          <div className="flex items-start gap-3 rounded-lg bg-background-surface px-4 py-3">
            <SearchX className="mt-0.5 h-4 w-4 shrink-0 text-foreground-tertiary" aria-hidden />
            <div>
              <p className="text-[14px] font-medium text-foreground">Not enough evidence in this transcript</p>
              <p className="mt-1 text-[14px] leading-relaxed text-foreground-secondary">{entry.result.answer}</p>
            </div>
          </div>
        )}

        {entry.status === 'answered' && !entry.result.insufficientEvidence && (
          <>
            <p className="type-eyebrow mb-2">Answer</p>
            <p className="whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground">{entry.result.answer}</p>
            <div className="mt-5">
              <p className="type-eyebrow mb-2 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden /> Evidence · {entry.result.citations.length} verified
              </p>
              <ul className="space-y-2">
                {entry.result.citations.map((c) => (
                  <li key={`${c.segmentId}-${c.excerpt}`} className="relative rounded-lg border border-border-subtle py-3 pl-5 pr-4">
                    <span aria-hidden className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-lemon-600" />
                    <blockquote className="text-[14px] leading-relaxed text-foreground">&ldquo;{c.excerpt}&rdquo;</blockquote>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[13px] text-foreground-tertiary">
                      <span>
                        Segment #{c.segmentIndex} · {formatDuration(c.startMs)}
                        {c.speakerLabel ? ` · ${c.speakerLabel}` : ''}
                      </span>
                      <Link
                        href={`/transcripts/${transcriptId}#segment-${c.segmentIndex}`}
                        className="inline-flex items-center gap-0.5 font-medium text-foreground-link hover:underline"
                      >
                        Open segment <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 text-[12px] text-foreground-tertiary">
              {entry.result.model} · {entry.result.promptVersion}
            </p>
          </>
        )}
      </div>
    </article>
  );
}

/**
 * AI Dialogue — questions answered only from one transcript, with every
 * cited excerpt verified verbatim by the server before it is shown. Answers
 * are exploration aids and are not stored; evidence becomes a finding only
 * through the quotation workflow.
 */
function DialogueWorkspace() {
  const params = useSearchParams();
  const router = useRouter();
  const transcripts = useAllTranscripts();
  const completed = (transcripts.data ?? []).filter((t) => t.status === 'COMPLETED');
  const [transcriptId, setTranscriptId] = useState(params.get('transcript') ?? '');
  const [question, setQuestion] = useState('');
  const [entries, setEntries] = useState<Entry[]>([]);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!transcriptId && completed.length === 1) setTranscriptId(completed[0].id);
  }, [completed, transcriptId]);

  const ask = useMutation({
    mutationFn: async (vars: { id: number; question: string }) => (await API.transcripts.ask(transcriptId, vars.question)).data.data,
    onSuccess: (result, vars) =>
      setEntries((prev) => prev.map((e) => (e.id === vars.id ? { id: e.id, status: 'answered', question: e.question, result } : e))),
    onError: (err, vars) => {
      const e = err as { message?: string; status?: number };
      const message =
        e.status === 403
          ? "This participant's consent does not permit AI analysis."
          : e.status === 503
            ? `No answer: ${e.message ?? 'the AI provider is unavailable'}. Nothing unverified is shown.`
            : (e.message ?? 'The question could not be answered.');
      setEntries((prev) => prev.map((x) => (x.id === vars.id ? { id: x.id, status: 'failed', question: x.question, error: message } : x)));
    },
  });

  const submit = (e?: FormEvent, text = question) => {
    e?.preventDefault();
    const q = text.trim();
    if (q.length < 3 || !transcriptId || ask.isPending) return;
    const id = nextId.current++;
    setEntries((prev) => [...prev, { id, status: 'pending', question: q }]);
    setQuestion('');
    ask.mutate({ id, question: q });
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  };

  const selected = completed.find((t) => t.id === transcriptId);

  if (transcripts.isLoading) return <LoadingState message="Loading transcripts" />;
  if (transcripts.isError) {
    const e = transcripts.error as { message?: string; status?: number };
    return <ErrorState message={e?.message} status={e?.status} onRetry={() => transcripts.refetch()} />;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="AI Dialogue"
        description="Ask a question of one interview. Answers come only from that transcript, and each cited excerpt is checked word-for-word against its segment before you see it."
      />

      {completed.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No completed transcripts yet"
          description="AI Dialogue works on a finished transcript whose participant consented to AI analysis."
          action={
            <Button variant="secondary" asChild>
              <Link href="/transcripts">Go to transcripts</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-6 rounded-xl border border-border-subtle bg-background-elevated p-4 shadow-soft sm:p-5">
            <label htmlFor="dialogue-transcript" className="mb-1.5 block text-[14px] font-medium text-foreground">
              Transcript
            </label>
            <NativeSelect
              id="dialogue-transcript"
              value={transcriptId}
              onChange={(e) => {
                setTranscriptId(e.target.value);
                setEntries([]);
                router.replace(e.target.value ? `/ai?transcript=${e.target.value}` : '/ai');
              }}
            >
              <option value="">Choose a transcript</option>
              {completed.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.interview?.participant?.displayName ?? `Transcript ${t.id.slice(0, 8)}`} · {t._count?.segments ?? 0} segments
                </option>
              ))}
            </NativeSelect>
            {selected && (
              <p className="mt-2 text-[13px] text-foreground-tertiary">
                <Link href={`/transcripts/${selected.id}`} className="text-foreground-link hover:underline">
                  Read the transcript
                </Link>{' '}
                · Answers in this session are not saved.
              </p>
            )}
          </div>

          <div className="space-y-4" aria-live="polite">
            {entries.map((entry) => (
              <AnswerCard key={entry.id} entry={entry} transcriptId={transcriptId} />
            ))}
            <div ref={endRef} />
          </div>

          {transcriptId && (
            <form onSubmit={submit} className="glass sticky bottom-4 mt-6 rounded-xl border p-3 shadow-float">
              <label htmlFor="dialogue-question" className="sr-only">
                Your question
              </label>
              <Textarea
                id="dialogue-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) submit(e as unknown as FormEvent);
                }}
                rows={2}
                maxLength={1000}
                placeholder="Ask about what this participant said…"
                className="min-h-[56px] resize-none border-0 bg-transparent px-2 focus-visible:ring-0"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
                {entries.length === 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {STARTERS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => submit(undefined, s)}
                        className="rounded-full border border-border bg-background-elevated px-3 py-1 text-[13px] text-foreground-secondary hover:border-border-strong hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-[12px] text-foreground-tertiary">Enter to ask · Shift+Enter for a new line</span>
                )}
                <Button type="submit" disabled={question.trim().length < 3} loading={ask.isPending}>
                  <MessagesSquare className="h-4 w-4" aria-hidden /> Ask
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default function AiDialoguePage() {
  return (
    <Suspense>
      <DialogueWorkspace />
    </Suspense>
  );
}
