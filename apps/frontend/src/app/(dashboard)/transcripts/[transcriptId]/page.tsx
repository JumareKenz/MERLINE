'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { MessagesSquare, Quote, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { QuoteSegmentDialog } from '@/components/findings/quote-segment-dialog';
import { useTranscript } from '@/hooks/use-transcripts';
import { useInterview } from '@/hooks/use-interviews';
import { useConsent } from '@/hooks/use-consents';
import { useSession } from '@/hooks/use-session';
import { formatDuration } from '@/lib/utils';
import type { TranscriptSegment } from '@/types/transcript';

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

/**
 * Reading surface for one transcript. Segments keep their index and
 * timestamps visible because they are the unit of evidence: every
 * quotation, finding and AI Dialogue citation points back to one of them.
 */
export default function TranscriptPage() {
  const { transcriptId } = useParams<{ transcriptId: string }>();
  const session = useSession();
  const { data, isLoading, isError, error, refetch } = useTranscript(transcriptId);
  const transcript = data?.data?.data;
  const { data: interviewData } = useInterview(transcript?.interviewId ?? '');
  const interview = interviewData?.data?.data;
  const { data: consentData } = useConsent(interview?.consentId ?? '');
  const consent = consentData?.data?.data;
  const [query, setQuery] = useState('');
  const [quoting, setQuoting] = useState<TranscriptSegment | null>(null);

  const segments = useMemo(() => transcript?.segments ?? [], [transcript]);
  const q = query.trim();
  const visible = q ? segments.filter((s) => s.text.toLowerCase().includes(q.toLowerCase())) : segments;

  if (isLoading) return <LoadingState message="Loading transcript" rows={6} />;
  if (isError || !transcript) {
    const e = error as { message?: string; status?: number } | null;
    return <ErrorState message={e?.message ?? 'This transcript could not be found.'} status={e?.status ?? 404} onRetry={() => refetch()} />;
  }

  const active = consent && !consent.withdrawnAt;
  const canQuote = session.can('create.findings') && !!active && consent.allowQuotation;
  const canAsk = session.can('use.ai') && !!active && consent.allowAiAnalysis;

  return (
    <div>
      <PageHeader
        eyebrow="Transcript"
        title={interview?.participant?.displayName ?? 'Transcript'}
        meta={<StatusBadge status={transcript.status} />}
        description={
          <>
            {segments.length} segments{transcript.language ? ` · ${transcript.language}` : ''}
            {transcript.provider ? ` · transcribed by ${transcript.provider}` : ''} ·{' '}
            <Link href={`/interviews/${transcript.interviewId}`} className="text-foreground-link hover:underline">
              View interview
            </Link>
          </>
        }
        actions={
          canAsk && (
            <Button variant="secondary" asChild>
              <Link href={`/ai?transcript=${transcript.id}`}>
                <MessagesSquare className="h-4 w-4" aria-hidden /> Ask about this transcript
              </Link>
            </Button>
          )
        }
      />

      {consent && !canQuote && session.can('create.findings') && (
        <p className="mb-4 rounded-lg bg-info-bg px-4 py-3 text-[14px] text-foreground">
          Quoting is unavailable: this participant&apos;s consent does not permit quotation{consent.withdrawnAt ? ' (withdrawn)' : ''}.
        </p>
      )}

      <div className="sticky top-14 z-10 -mx-4 mb-4 bg-background/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:top-16 lg:-mx-8 lg:px-8">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-tertiary" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this transcript" aria-label="Search this transcript" className="pl-9" />
        </div>
        {q && (
          <p className="mt-2 text-[13px] text-foreground-secondary" role="status">
            {visible.length} of {segments.length} segments match
          </p>
        )}
      </div>

      {segments.length === 0 ? (
        <EmptyState size="inline" title="No segments" description="This transcript has no text yet." />
      ) : visible.length === 0 ? (
        <EmptyState size="inline" title="No matches" description="No segment contains that text." />
      ) : (
        <ol className="overflow-hidden rounded-xl border border-border-subtle bg-background-elevated shadow-soft">
          {visible.map((segment) => (
            <li
              key={segment.id}
              id={`segment-${segment.index}`}
              className="group grid grid-cols-[64px_minmax(0,1fr)] gap-x-4 border-b border-border-subtle px-4 py-4 last:border-b-0 target:bg-lemon-50 sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:px-5"
            >
              <div className="pt-0.5 text-[13px] tabular-nums text-foreground-tertiary">
                <span className="block font-medium text-foreground-secondary">{formatDuration(segment.startMs)}</span>
                <span className="block">#{segment.index}</span>
              </div>
              <div className="min-w-0">
                {segment.speakerLabel && <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-foreground-tertiary">{segment.speakerLabel}</p>}
                <p className="text-[15px] leading-[1.7] text-foreground">
                  <Highlight text={segment.text} query={q} />
                </p>
              </div>
              {canQuote && (
                <div className="col-start-2 mt-2 sm:col-start-3 sm:mt-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                    onClick={() => setQuoting(segment)}
                    aria-label={`Quote segment ${segment.index}`}
                  >
                    <Quote className="h-3.5 w-3.5" aria-hidden /> Quote
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {quoting && <QuoteSegmentDialog key={quoting.id} segment={quoting} open={!!quoting} onOpenChange={(open) => !open && setQuoting(null)} />}
    </div>
  );
}
