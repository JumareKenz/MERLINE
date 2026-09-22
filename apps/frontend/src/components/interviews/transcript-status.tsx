'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronDown, ChevronUp, Quote, RotateCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { QuoteSegmentDialog } from '@/components/findings/quote-segment-dialog';
import type { Recording } from '@/types/interview';
import type { Transcript, TranscriptSegment } from '@/types/transcript';
import { useRequestTranscript, useRetryTranscript } from '@/hooks/use-transcripts';
import { useAiDraftFinding } from '@/hooks/use-findings';
import { formatDuration } from '@/lib/utils';

interface TranscriptStatusProps {
  interviewId: string;
  recording: Recording;
  transcript?: Transcript;
}

export function TranscriptStatus({ interviewId, recording, transcript }: TranscriptStatusProps) {
  const [expanded, setExpanded] = useState(false);
  const [quotingSegment, setQuotingSegment] = useState<TranscriptSegment | null>(null);
  const router = useRouter();
  const requestTranscript = useRequestTranscript();
  const retryTranscript = useRetryTranscript();
  const aiDraft = useAiDraftFinding();

  if (!transcript) {
    return (
      <div className="flex items-center justify-between rounded-md bg-background-surface px-3 py-2">
        <span className="text-[12px] text-foreground-tertiary">No transcript requested</span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[12px]"
          loading={requestTranscript.isPending}
          onClick={() => requestTranscript.mutate({ interviewId, mediaId: recording.id })}
        >
          Request Transcript
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-background-surface px-3 py-2 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge status={transcript.status} />
          {transcript.language && (
            <span className="text-[12px] text-foreground-tertiary">{transcript.language}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {transcript.status === 'FAILED' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[12px]"
              loading={retryTranscript.isPending}
              onClick={() => retryTranscript.mutate(transcript.id)}
            >
              <RotateCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          )}
          {transcript.status === 'COMPLETED' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[12px]"
                loading={aiDraft.isPending}
                onClick={async () => {
                  const result = await aiDraft.mutateAsync(transcript.id);
                  router.push(`/findings/${result.data.data.id}`);
                }}
              >
                <Sparkles className="h-3 w-3 mr-1" /> Draft Finding with AI
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[12px]" onClick={() => setExpanded((v) => !v)}>
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </>
          )}
        </div>
      </div>

      {transcript.status === 'FAILED' && transcript.errorMessage && (
        <div className="flex items-start gap-1.5 text-[12px] text-error">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{transcript.errorMessage}</span>
        </div>
      )}

      {expanded && transcript.segments && transcript.segments.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-border-subtle">
          {transcript.segments.map((segment) => (
            <div key={segment.id} className="group flex items-start gap-3 py-1">
              <span className="text-[11px] text-foreground-tertiary font-mono shrink-0 pt-0.5">
                {formatDuration(segment.startMs)}
              </span>
              <p className="text-[12px] text-foreground-secondary flex-1">{segment.text}</p>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-[11px] opacity-0 group-hover:opacity-100 shrink-0"
                onClick={() => setQuotingSegment(segment)}
              >
                <Quote className="h-3 w-3 mr-1" /> Quote
              </Button>
            </div>
          ))}
        </div>
      )}

      {quotingSegment && (
        <QuoteSegmentDialog
          segment={quotingSegment}
          open={!!quotingSegment}
          onOpenChange={(open) => !open && setQuotingSegment(null)}
        />
      )}
    </div>
  );
}
