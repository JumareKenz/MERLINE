'use client';

import { useParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { RecordingUploader } from '@/components/interviews/recording-uploader';
import { AudioRecorder } from '@/components/interviews/audio-recorder';
import { useInterview, useUpdateInterviewStatus, useRecordings } from '@/hooks/use-interviews';
import { useConsent } from '@/hooks/use-consents';
import { useParticipant } from '@/hooks/use-participants';
import type { InterviewStatus } from '@/types/interview';

const NEXT_STATUS: Record<InterviewStatus, { status: InterviewStatus; label: string }[]> = {
  SCHEDULED: [{ status: 'IN_PROGRESS', label: 'Start' }],
  IN_PROGRESS: [{ status: 'COMPLETED', label: 'Mark Complete' }],
  COMPLETED: [],
  CANCELLED: [],
};

export default function FieldInterviewDetailPage() {
  const { interviewId } = useParams<{ interviewId: string }>();

  const { data: interviewData, isLoading, isError, error, refetch } = useInterview(interviewId);
  const interview = interviewData?.data?.data;

  const { data: participantData } = useParticipant(interview?.participantId || '');
  const { data: consentData } = useConsent(interview?.consentId || '');
  const { data: recordingsData } = useRecordings(interviewId);
  const updateStatus = useUpdateInterviewStatus();

  const participant = participantData?.data?.data;
  const consent = consentData?.data?.data;
  const recordings = recordingsData?.data?.data || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (isError || !interview) {
    return <ErrorState message={error?.message || 'Interview not found'} onRetry={() => refetch()} />;
  }

  const transitions = NEXT_STATUS[interview.status];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">
            {participant?.displayName || 'Interview'}
          </h1>
          <StatusBadge status={interview.status} />
        </div>
        {transitions.map((t) => (
          <Button
            key={t.status}
            loading={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ id: interviewId, status: t.status })}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {interview.status === 'COMPLETED' ? (
        <div className="flex items-center gap-2 rounded-md bg-success-bg text-success px-3 py-3 text-[13px]">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> This interview is complete.
        </div>
      ) : consent?.allowRecording ? (
        <div className="space-y-3">
          <AudioRecorder interviewId={interviewId} />
          <details className="text-[12px] text-foreground-tertiary">
            <summary className="cursor-pointer select-none">Upload a file instead</summary>
            <div className="mt-2">
              <RecordingUploader interviewId={interviewId} />
            </div>
          </details>
        </div>
      ) : (
        <p className="text-[13px] text-foreground-tertiary py-2">
          Consent on file does not permit recording this interview.
        </p>
      )}

      {recordings.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] font-medium text-foreground-tertiary uppercase tracking-wide">
            {recordings.length} recording{recordings.length === 1 ? '' : 's'} uploaded
          </p>
          {recordings.map((recording) => (
            <div key={recording.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-[13px] truncate">{recording.originalName}</span>
              <span className="text-[12px] text-foreground-tertiary shrink-0 ml-2">
                {(recording.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
