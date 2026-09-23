'use client';

import Link from 'next/link';
import { Headphones, Sparkles } from 'lucide-react';
import type { ReportBlock, ReportDocument } from '@/types/analysis-report';
import { cn, formatDuration } from '@/lib/utils';

function AiPill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary">
      <Sparkles className="h-3 w-3" aria-hidden /> AI analysis
    </span>
  );
}

function Block({ block, doc }: { block: ReportBlock; doc: ReportDocument }) {
  switch (block.type) {
    case 'paragraph':
      return <p className="text-[15px] leading-[1.75] text-foreground">{block.text}</p>;
    case 'bullets':
    case 'numbered': {
      const List = block.type === 'bullets' ? 'ul' : 'ol';
      return (
        <List className={cn('space-y-1.5 pl-5 text-[15px] leading-[1.7] text-foreground marker:text-primary', block.type === 'bullets' ? 'list-disc' : 'list-decimal')}>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </List>
      );
    }
    case 'callout':
      return (
        <p className={cn('rounded-lg px-4 py-3 text-[14px] leading-relaxed', block.tone === 'warning' ? 'bg-warning-bg text-foreground' : 'bg-info-bg text-foreground')}>
          {block.text}
        </p>
      );
    case 'facts':
      return (
        <dl className="grid overflow-hidden rounded-xl border border-border-subtle sm:grid-cols-2 lg:grid-cols-3">
          {block.items.map((f) => (
            <div key={f.label} className="border-b border-border-subtle px-4 py-3 sm:border-r">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">{f.label}</dt>
              <dd className="mt-0.5 text-[14px] font-medium text-foreground">{f.value}</dd>
            </div>
          ))}
        </dl>
      );
    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full min-w-[560px] border-collapse text-left text-[13.5px]">
            <thead>
              <tr className="bg-navy text-white dark:bg-primary-700">
                {block.columns.map((c) => (
                  <th key={c} scope="col" className="px-3.5 py-2.5 font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-t border-border-subtle even:bg-background-surface">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={cn(
                        'px-3.5 py-2.5 align-top leading-relaxed text-foreground',
                        j === 0 && cell === 'High' && 'font-semibold text-error',
                        j === 0 && cell === 'Medium' && 'font-semibold text-warning',
                        j === 0 && cell === 'Low' && 'font-semibold text-foreground-secondary',
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'quote': {
      const q = doc.quotes[block.quoteId];
      if (!q) return null;
      return (
        <figure className="rounded-r-xl border-l-[3px] border-lemon-500 bg-background-surface py-3 pl-4 pr-4">
          <blockquote className="text-[15.5px] italic leading-relaxed text-foreground">“{q.text}”</blockquote>
          <figcaption className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-foreground-tertiary">
            <span className="font-semibold uppercase tracking-[0.08em] text-lemon-800 dark:text-lemon-300">Verbatim</span>
            <span>{q.source}</span>
            <span aria-hidden>·</span>
            <Link
              href={`/transcripts/${q.transcriptId}?segment=${q.segmentId}`}
              className="inline-flex items-center gap-1 font-medium text-foreground-link hover:underline"
              aria-label={`Listen at ${formatDuration(q.startMs)} in the transcript`}
            >
              <Headphones className="h-3.5 w-3.5" aria-hidden /> {formatDuration(q.startMs)}
            </Link>
          </figcaption>
          {block.note && <p className="mt-2 text-[13.5px] text-foreground-secondary">{block.note}</p>}
        </figure>
      );
    }
  }
}

/**
 * On-screen rendering of a report: the same document the Word, Excel and
 * PDF exports are made from. Sections written by the model carry an "AI
 * analysis" label; quotations are verbatim and link to the moment in the
 * recording they come from.
 */
export function ReportView({ doc }: { doc: ReportDocument }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Report contents" className="hidden lg:block">
        <ol className="sticky top-24 space-y-1 border-l border-border-subtle">
          {doc.sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="-ml-px block border-l-2 border-transparent py-1 pl-3 text-[13px] leading-snug text-foreground-secondary hover:border-primary hover:text-foreground">
                <span className="tabular-nums text-foreground-tertiary">{String(i + 1).padStart(2, '0')}</span> {s.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="min-w-0 space-y-10">
        {doc.sections.map((s, i) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24">
            <header className="mb-4 flex flex-wrap items-center gap-3 border-b-2 border-navy pb-2 dark:border-primary-500">
              <span className="rounded bg-lemon-500 px-1.5 py-0.5 text-[12px] font-semibold tabular-nums text-lemon-foreground">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 id={`${s.id}-h`} className="min-w-0 flex-1 text-[19px] font-semibold leading-snug tracking-[-0.01em] text-navy dark:text-foreground">
                {s.heading}
              </h2>
              {s.aiGenerated && <AiPill />}
            </header>
            <div className="space-y-4">
              {s.blocks.map((b, j) => (
                <Block key={j} block={b} doc={doc} />
              ))}
            </div>
          </section>
        ))}
        <p className="rounded-xl bg-background-surface px-4 py-3 text-[13px] leading-relaxed text-foreground-secondary">{doc.disclosure}</p>
      </article>
    </div>
  );
}
