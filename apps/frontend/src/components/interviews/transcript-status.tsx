'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, Loader2, RotateCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import type { Recording } from '@/types/interview';
import type { Transcript } from '@/types/transcript';
import { useRequestTranscript, useRetryTranscript } from '@/hooks/use-transcripts';
import { useAiDraftFinding } from '@/hooks/use-findings';
import { INTERVIEW_LANGUAGES, languageLabel } from '@/lib/languages';
import { formatDuration } from '@/lib/utils';

interface TranscriptStatusProps {
  interviewId: string;
  recording: Recording;
  transcript?: Transcript;
  /** The interview's language, if recorded: the default hint. */
  interviewLanguage?: string | null;
  /** Consent flags: actions consent does not permit are not offered (the API refuses them too). */
  allowTranscription?: boolean;
  allowAiAnalysis?: boolean;
}

function LanguagePicker({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <>
      <label htmlFor={id} className="sr-only">
        Language of the recording
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-control-sm rounded-md border border-border-subtle bg-background-elevated px-2 text-[13px] text-foreground"
      >
        <option value="">Detect language</option>
        {INTERVIEW_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </>
  );
}

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * One recording's transcription state, with the single next action it
 * needs. Transcription runs in the background, so this shows queued,
 * retrying and failed states honestly rather than a spinner that never ends.
 */
export function TranscriptStatus({
  interviewId,
  recording,
  transcript,
  interviewLanguage,
  allowTranscription = true,
  allowAiAnalysis = true,
}: TranscriptStatusProps) {
  const router = useRouter();
  const requestTranscript = useRequestTranscript();
  const retryTranscript = useRetryTranscript();
  const aiDraft = useAiDraftFinding();
  const [language, setLanguage] = useState(transcript?.requestedLanguage ?? interviewLanguage ?? '');

  if (!transcript) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background-surface px-3 py-2.5">
        <span className="inline-flex items-center gap-2 text-[13px] text-foreground-secondary">
          <FileText className="h-4 w-4 text-foreground-tertiary" aria-hidden />
          {allowTranscription ? 'Not transcribed yet' : 'Consent does not permit transcription'}
        </span>
        {allowTranscription && (
          <div className="flex items-center gap-2">
            <LanguagePicker id={`lang-${recording.id}`} value={language} onChange={setLanguage} />
            <Button
              size="sm"
              variant="secondary"
              loading={requestTranscript.isPending}
              onClick={() => requestTranscript.mutate({ interviewId, mediaId: recording.id, language: language || undefined })}
            >
              Transcribe
            </Button>
          </div>
        )}
      </div>
    );
  }

  const busy = transcript.status === 'PENDING' || transcript.status === 'PROCESSING';
  const retrying = transcript.status === 'PENDING' && !!transcript.nextAttemptAt;
  const noSpeech = transcript.status === 'COMPLETED' && transcript._count?.segments === 0;
  const lang = languageLabel(transcript.language);

  return (
    <div className="space-y-2 rounded-lg bg-background-surface px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2" role="status" aria-live="polite">
          <StatusBadge status={transcript.status} />
          {busy && (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-foreground-secondary">
              {!retrying && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
              {retrying
                ? `Retrying automatically at ${timeOf(transcript.nextAttemptAt!)}`
                : transcript.status === 'PROCESSING'
                  ? 'Transcribing…'
                  : 'Queued'}
            </span>
          )}
          {transcript.status === 'COMPLETED' && (
            <span className="text-[13px] text-foreground-tertiary">
              {[
                noSpeech ? 'No speech detected' : lang,
                transcript.durationMs ? formatDuration(transcript.durationMs) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {transcript.status === 'FAILED' && allowTranscription && (
            <>
              <LanguagePicker id={`retry-lang-${transcript.id}`} value={language} onChange={setLanguage} />
              <Button
                size="sm"
                variant="secondary"
                loading={retryTranscript.isPending}
                onClick={() => retryTranscript.mutate({ id: transcript.id, language: language || undefined })}
              >
                <RotateCw className="h-3.5 w-3.5" aria-hidden /> Retry
              </Button>
            </>
          )}
          {transcript.status === 'COMPLETED' && (
            <>
              {allowAiAnalysis && !noSpeech && (
                <Button
                  size="sm"
                  variant="ghost"
                  loading={aiDraft.isPending}
                  onClick={async () => {
                    const result = await aiDraft.mutateAsync(transcript.id).catch(() => null);
                    const drafted = result?.data.data.findings ?? [];
                    if (drafted.length === 1) router.push(`/findings/${drafted[0].id}`);
                    else if (drafted.length > 1) router.push('/findings');
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden /> Draft findings
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
      {transcript.status === 'COMPLETED' && allowTranscription && (
        <details className="text-[13px]">
          <summary className="cursor-pointer text-foreground-secondary hover:text-foreground">
            Wrong language? Transcribe again
          </summary>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <LanguagePicker id={`again-lang-${transcript.id}`} value={language} onChange={setLanguage} />
            <Button
              size="sm"
              variant="secondary"
              loading={requestTranscript.isPending}
              onClick={() => requestTranscript.mutate({ interviewId, mediaId: recording.id, language: language || undefined })}
            >
              Transcribe again
            </Button>
            <span className="text-foreground-tertiary">The current transcript, its corrections and findings are kept.</span>
          </div>
        </details>
      )}
      {transcript.errorMessage && (transcript.status === 'FAILED' || retrying) && (
        <p className={transcript.status === 'FAILED' ? 'text-[13px] text-foreground-error' : 'text-[13px] text-foreground-secondary'}>
          {transcript.errorMessage}
        </p>
      )}
    </div>
  );
}
