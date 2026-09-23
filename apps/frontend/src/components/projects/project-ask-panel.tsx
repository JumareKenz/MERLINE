'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { FileDown, Headphones, Loader2, MessagesSquare, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { downloadReport, useAnalysisReport, useAskProject, useRequestReport } from '@/hooks/use-analysis-reports';
import { cn, formatDuration } from '@/lib/utils';
import { EXPORT_FORMATS, type ExportFormat, type ProjectAnswer } from '@/types/analysis-report';
import { toast } from 'sonner';

const EXAMPLES = [
  'A two-page executive brief for the donor, with the top five findings and recommendations',
  'A briefing for the state water ministry focused on maintenance funding, with a recommendations table',
  'Compare what key informants and focus groups said, as a table',
];

function Answer({ answer }: { answer: ProjectAnswer }) {
  return (
    <div className="space-y-4 rounded-xl border border-border-subtle bg-background-elevated p-5 shadow-soft">
      <p className="inline-flex items-center gap-1 rounded-full border border-primary/25 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary">
        <Sparkles className="h-3 w-3" aria-hidden /> AI answer · from {answer.coverage.withReports} of {answer.coverage.interviews} interviews
      </p>
      {answer.insufficientEvidence && (
        <p className="rounded-lg bg-warning-bg px-3 py-2 text-[14px] text-foreground">The interviews do not clearly answer this.</p>
      )}
      {answer.answer.map((p, i) => (
        <p key={i} className="text-[15px] leading-[1.7] text-foreground">
          {p}
        </p>
      ))}
      {answer.quotes.length > 0 && (
        <div className="space-y-3 border-t border-border-subtle pt-4">
          {answer.quotes.map((q) => (
            <figure key={q.id} className="rounded-r-xl border-l-[3px] border-lemon-500 bg-background-surface py-2.5 pl-4 pr-3">
              <blockquote className="text-[14.5px] italic text-foreground">“{q.text}”</blockquote>
              <figcaption className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-foreground-tertiary">
                <span className="font-semibold uppercase tracking-[0.08em] text-lemon-800 dark:text-lemon-300">Verbatim</span>
                {q.source} ·
                <Link href={`/transcripts/${q.transcriptId}?segment=${q.segmentId}`} className="inline-flex items-center gap-1 text-foreground-link hover:underline">
                  <Headphones className="h-3.5 w-3.5" aria-hidden /> {formatDuration(q.startMs)}
                </Link>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}

/** Watches a requested brief and downloads it in the chosen format when ready. */
function BriefProgress({ reportId, format, onDone }: { reportId: string; format: ExportFormat; onDone: () => void }) {
  const { data } = useAnalysisReport(reportId);
  const fired = useRef(false);
  useEffect(() => {
    if (!data || fired.current) return;
    if (data.status === 'COMPLETED') {
      fired.current = true;
      downloadReport(data.id, format, data.title)
        .catch((e: { message?: string }) => toast.error(e?.message ?? 'The file could not be created'))
        .finally(onDone);
    }
    if (data.status === 'FAILED') {
      fired.current = true;
      toast.error(data.errorMessage ?? 'The brief could not be written');
      onDone();
    }
  }, [data, format, onDone]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-background-surface px-4 py-3" role="status" aria-live="polite">
      <span className="inline-flex items-center gap-2 text-[14px] text-foreground">
        {data?.status === 'COMPLETED' ? <FileDown className="h-4 w-4 text-success" aria-hidden /> : <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {data?.status === 'COMPLETED'
          ? `Ready. Your ${EXPORT_FORMATS.find((f) => f.value === format)?.label} file is downloading.`
          : 'Writing your document. It will download automatically when ready.'}
      </span>
      <Link href={`/analysis/${reportId}`} className="text-[14px] font-medium text-foreground-link hover:underline">
        View on screen
      </Link>
    </div>
  );
}

/**
 * Ask the project anything, or ask for a document: a quick grounded answer
 * on screen, or a brief written to your instructions and delivered as a
 * branded PDF, Word or Excel file.
 */
export function ProjectAskPanel({ projectId }: { projectId: string }) {
  const [mode, setMode] = useState<'answer' | 'document'>('answer');
  const [text, setText] = useState('');
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [pending, setPending] = useState<{ id: string; format: ExportFormat } | null>(null);
  const ask = useAskProject();
  const request = useRequestReport();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (value.length < 3) return;
    if (mode === 'answer') {
      ask.mutate({ projectId, question: value });
    } else {
      const report = await request.mutateAsync({ scope: 'CUSTOM', projectId, instructions: value }).catch(() => null);
      if (report) setPending({ id: report.id, format });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border-subtle bg-background-elevated p-5 shadow-soft">
          <div role="tablist" aria-label="What do you want?" className="inline-flex rounded-lg bg-background-surface p-1">
            {(
              [
                ['answer', 'Ask a question', MessagesSquare],
                ['document', 'Create a document', FileDown],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                onClick={() => setMode(key)}
                className={cn(
                  'inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[13.5px] font-medium transition-colors',
                  mode === key ? 'bg-background-elevated text-foreground shadow-soft' : 'text-foreground-secondary hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden /> {label}
              </button>
            ))}
          </div>

          <label htmlFor="ask-text" className="sr-only">
            {mode === 'answer' ? 'Your question' : 'Describe the document you need'}
          </label>
          <Textarea
            id="ask-text"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={mode === 'answer' ? 1000 : 2000}
            placeholder={
              mode === 'answer'
                ? 'e.g. What do respondents say about maintenance costs, and who is most affected?'
                : 'Describe the document: audience, length, structure, what to emphasise.'
            }
            className="text-[15px]"
          />

          {mode === 'document' && (
            <fieldset>
              <legend className="mb-2 text-[13px] font-medium text-foreground-secondary">Format</legend>
              <div className="grid grid-cols-3 gap-2">
                {EXPORT_FORMATS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={format === f.value}
                    onClick={() => setFormat(f.value)}
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-left transition-colors',
                      format === f.value ? 'border-primary bg-primary-50 ring-1 ring-primary' : 'border-border-subtle hover:border-border-strong',
                    )}
                  >
                    <span className="block text-[14px] font-semibold text-foreground">{f.label}</span>
                    <span className="block text-[12px] text-foreground-tertiary">{f.hint}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-[12.5px] text-foreground-tertiary">Answers draw only on this project&apos;s interviews and quote them word for word.</p>
            <Button type="submit" loading={ask.isPending || request.isPending} disabled={text.trim().length < 3 || !!pending}>
              <Sparkles className="h-4 w-4" aria-hidden /> {mode === 'answer' ? 'Ask' : 'Create document'}
            </Button>
          </div>
        </form>

        {pending && <BriefProgress reportId={pending.id} format={pending.format} onDone={() => setPending(null)} />}
        {mode === 'answer' && ask.data && <Answer answer={ask.data} />}
      </div>

      <aside className="space-y-3">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">Try asking for</h3>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setMode('document');
              setText(ex);
            }}
            className="block w-full rounded-lg border border-border-subtle bg-background-elevated px-3.5 py-3 text-left text-[13.5px] leading-snug text-foreground-secondary transition-colors hover:border-border-strong hover:text-foreground"
          >
            {ex}
          </button>
        ))}
        <p className="pt-2 text-[12.5px] leading-relaxed text-foreground-tertiary">
          Questions use the interview reports already written. Generate the project report first to prepare every interview.
        </p>
      </aside>
    </div>
  );
}
