'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, RotateCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import type { Recording } from '@/types/interview';
import type { Transcript } from '@/types/transcript';
import { useRequestTranscript, useRetryTranscript } from '@/hooks/use-transcripts';
import { useAiDraftFinding } from '@/hooks/use-findings';

interface TranscriptStatusProps {
  interviewId: string;
  recording: Recording;
  transcript?: Transcript;
  /** Consent flags: actions consent does not permit are not offered (the API refuses them too). */
  allowTranscription?: boolean;
  allowAiAnalysis?: boolean;
}

/** One recording's processing state, with the single next action it needs. */
export function TranscriptStatus({ interviewId, recording, transcript, allowTranscription = true, allowAiAnalysis = true }: TranscriptStatusProps) {
  const router = useRouter();
  const requestTranscript = useRequestTranscript();
  const retryTranscript = useRetryTranscript();
  const aiDraft = useAiDraftFinding();

  if (!transcript) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background-surface px-3 py-2.5">
        <span className="inline-flex items-center gap-2 text-[13px] text-foreground-secondary">
          <FileText className="h-4 w-4 text-foreground-tertiary" aria-hidden />
          {allowTranscription ? 'Not transcribed yet' : 'Consent does not permit transcription'}
        </span>
        {allowTranscription && (
          <Button
            size="sm"
            variant="secondary"
            loading={requestTranscript.isPending}
            onClick={() => requestTranscript.mutate({ interviewId, mediaId: recording.id })}
          >
            Transcribe
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background-surface px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <StatusBadge status={transcript.status} />
        {transcript.status === 'FAILED' && transcript.errorMessage && (
          <span className="truncate text-[13px] text-foreground-secondary">{transcript.errorMessage}</span>
        )}
        {transcript.language && <span className="text-[13px] text-foreground-tertiary">{transcript.language}</span>}
      </div>
      <div className="flex items-center gap-2">
        {transcript.status === 'FAILED' && (
          <Button size="sm" variant="secondary" loading={retryTranscript.isPending} onClick={() => retryTranscript.mutate(transcript.id)}>
            <RotateCw className="h-3.5 w-3.5" aria-hidden /> Retry
          </Button>
        )}
        {transcript.status === 'COMPLETED' && (
          <>
            {allowAiAnalysis && (
              <Button
                size="sm"
                variant="ghost"
                loading={aiDraft.isPending}
                onClick={async () => {
                  const result = await aiDraft.mutateAsync(transcript.id).catch(() => null);
                  if (result) router.push(`/findings/${result.data.data.id}`);
                }}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> Draft finding
              </Button>
            )}
            <Button size="sm" variant="secondary" asChild>
              <Link href={`/transcripts/${transcript.id}`}>
                Open transcript <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
