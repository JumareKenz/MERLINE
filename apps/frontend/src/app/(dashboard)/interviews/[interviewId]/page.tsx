'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { RecordingUploader } from '@/components/interviews/recording-uploader';
import { TranscriptStatus } from '@/components/interviews/transcript-status';
import { useInterview, useUpdateInterviewStatus, useRecordings } from '@/hooks/use-interviews';
import { useConsent } from '@/hooks/use-consents';
import { useParticipant } from '@/hooks/use-participants';
import { useTranscriptsForInterview } from '@/hooks/use-transcripts';
import type { InterviewStatus } from '@/types/interview';
import { formatDate } from '@/lib/utils';

const NEXT_STATUS: Record<InterviewStatus, { status: InterviewStatus; label: string }[]> = {
  SCHEDULED: [
    { status: 'IN_PROGRESS', label: 'Start Interview' },
    { status: 'CANCELLED', label: 'Cancel' },
  ],
  IN_PROGRESS: [
    { status: 'COMPLETED', label: 'Mark Completed' },
    { status: 'CANCELLED', label: 'Cancel' },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

export default function InterviewDetailPage() {
  const { interviewId } = useParams<{ interviewId: string }>();

  const { data: interviewData, isLoading, isError, error, refetch } = useInterview(interviewId);
  const interview = interviewData?.data?.data;

  const { data: participantData } = useParticipant(interview?.participantId || '');
  const { data: consentData } = useConsent(interview?.consentId || '');
  const { data: recordingsData } = useRecordings(interviewId);
  const { data: transcriptsData } = useTranscriptsForInterview(interviewId);
  const updateStatus = useUpdateInterviewStatus();

  const participant = participantData?.data?.data;
  const consent = consentData?.data?.data;
  const recordings = recordingsData?.data?.data || [];
  const transcripts = transcriptsData?.data?.data || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (isError || !interview) {
    return <ErrorState message={error?.message || 'Interview not found'} onRetry={() => refetch()} />;
  }

  const transitions = NEXT_STATUS[interview.status];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={interview.status} />
            {interview.scheduledAt && (
              <span className="text-[12px] text-foreground-tertiary">{formatDate(interview.scheduledAt)}</span>
            )}
          </div>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">
            {participant ? (
              <Link href={`/participants/${participant.id}`} className="hover:underline">
                {participant.displayName}
              </Link>
            ) : (
              'Interview'
            )}
          </h1>
          {interview.location && <p className="text-[13px] text-foreground-tertiary mt-0.5">{interview.location}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {transitions.map((t) => (
            <Button
              key={t.status}
              size="sm"
              variant={t.status === 'CANCELLED' ? 'outline' : 'default'}
              className="h-8 px-3 text-[13px]"
              loading={updateStatus.isPending}
              onClick={() => updateStatus.mutate({ id: interviewId, status: t.status })}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {interview.notes && (
        <Card>
          <CardContent className="p-4">
            <p className="text-[12px] text-foreground-tertiary uppercase tracking-wide mb-1">Notes</p>
            <p className="text-[13px]">{interview.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recordings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {consent?.allowRecording ? (
            <RecordingUploader interviewId={interviewId} />
          ) : (
            <p className="text-[13px] text-foreground-tertiary py-2">
              Consent on file for this interview does not permit recording.
            </p>
          )}

          {recordings.length > 0 && (
            <div className="space-y-3 pt-2">
              {recordings.map((recording) => (
                <div key={recording.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[12px] text-foreground-tertiary">
                    <span>{recording.originalName}</span>
                    <span>{(recording.size / 1024 / 1024).toFixed(1)} MB</span>
                  </div>
                  <TranscriptStatus
                    interviewId={interviewId}
                    recording={recording}
                    transcript={transcripts.find((t) => t.mediaId === recording.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
