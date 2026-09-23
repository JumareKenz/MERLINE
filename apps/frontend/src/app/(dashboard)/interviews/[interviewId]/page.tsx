'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AudioLines, CalendarClock, MapPin, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConsentSummary } from '@/components/interviews/consent-summary';
import { RecordingPlayer } from '@/components/interviews/recording-player';
import { RecordingUploader } from '@/components/interviews/recording-uploader';
import { TranscriptStatus } from '@/components/interviews/transcript-status';
import { useInterview, useRecordings, useUpdateInterviewStatus } from '@/hooks/use-interviews';
import { useConsent } from '@/hooks/use-consents';
import { useTranscriptsForInterview } from '@/hooks/use-transcripts';
import { useSession } from '@/hooks/use-session';
import { formatDateTime } from '@/lib/utils';
import type { InterviewStatus } from '@/types/interview';

const NEXT: Record<InterviewStatus, { status: InterviewStatus; label: string }[]> = {
  SCHEDULED: [{ status: 'IN_PROGRESS', label: 'Mark as started' }],
  IN_PROGRESS: [{ status: 'COMPLETED', label: 'Mark as completed' }],
  COMPLETED: [],
  CANCELLED: [],
};

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border-subtle bg-background-elevated p-5 shadow-soft ${className ?? ''}`}>
      <h2 className="type-section mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function InterviewDetailPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const session = useSession();
  const { data, isLoading, isError, error, refetch } = useInterview(interviewId);
  const interview = data?.data?.data;
  const { data: consentData } = useConsent(interview?.consentId || '');
  const { data: recordingsData, isLoading: recordingsLoading } = useRecordings(interviewId);
  const { data: transcriptsData } = useTranscriptsForInterview(session.can('view.transcripts') ? interviewId : '');
  const updateStatus = useUpdateInterviewStatus();
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (isLoading) return <LoadingState message="Loading interview" />;
  if (isError || !interview) {
    const e = error as { message?: string; status?: number } | null;
    return <ErrorState message={e?.message ?? 'This interview could not be found.'} status={e?.status ?? 404} onRetry={() => refetch()} />;
  }

  const consent = consentData?.data?.data;
  const recordings = recordingsData?.data?.data ?? [];
  const transcripts = transcriptsData?.data?.data ?? [];
  const recordingAllowed = !!consent?.allowRecording && !consent?.withdrawnAt;
  const canEdit = !session.isResolved || session.can('edit.interviews');
  const canViewTranscripts = session.can('view.transcripts');

  return (
    <div>
      <PageHeader
        eyebrow="Interview"
        title={interview.participant?.displayName ?? 'Interview'}
        meta={<StatusBadge status={interview.status} />}
        actions={
          canEdit && (
            <>
              {(interview.status === 'SCHEDULED' || interview.status === 'IN_PROGRESS') && (
                <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
                  Cancel interview
                </Button>
              )}
              {NEXT[interview.status].map((t) => (
                <Button key={t.status} loading={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: interviewId, status: t.status })}>
                  {t.label}
                </Button>
              ))}
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Panel title="Recordings">
            {recordingsLoading ? (
              <LoadingState rows={2} />
            ) : recordings.length === 0 ? (
              <EmptyState
                size="inline"
                icon={<AudioLines />}
                title="No audio yet"
                description={
                  recordingAllowed
                    ? 'Recordings made in the field app upload here automatically once the device is online.'
                    : 'Consent on file does not permit recording this interview.'
                }
              />
            ) : (
              <ul className="space-y-5">
                {recordings.map((recording) => (
                  <li key={recording.id} className="space-y-3">
                    <RecordingPlayer interviewId={interviewId} recording={recording} />
                    {canViewTranscripts && (
                      <TranscriptStatus
                        interviewId={interviewId}
                        recording={recording}
                        transcript={transcripts.find((t) => t.mediaId === recording.id)}
                        allowTranscription={!!consent?.allowTranscription && !consent?.withdrawnAt}
                        allowAiAnalysis={!!consent?.allowAiAnalysis && !consent?.withdrawnAt}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
            {recordingAllowed && session.can('upload.recordings') && interview.status !== 'CANCELLED' && (
              <details className="mt-5 border-t border-border-subtle pt-4">
                <summary className="cursor-pointer text-[14px] font-medium text-foreground-secondary hover:text-foreground">
                  Upload an audio file instead
                </summary>
                <div className="mt-3">
                  <RecordingUploader interviewId={interviewId} />
                </div>
              </details>
            )}
          </Panel>

          {interview.notes && (
            <Panel title="Briefing notes">
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foreground-secondary">{interview.notes}</p>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Details">
            <dl className="space-y-3 text-[14px]">
              <div className="flex gap-3">
                <dt className="sr-only">Participant</dt>
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-foreground-tertiary" aria-hidden />
                <dd>
                  <Link href={`/participants/${interview.participantId}`} className="font-medium text-foreground-link hover:underline">
                    {interview.participant?.displayName ?? 'Participant'}
                  </Link>
                  {interview.interviewer && (
                    <span className="block text-[13px] text-foreground-secondary">
                      Interviewer: {interview.interviewer.firstName} {interview.interviewer.lastName}
                    </span>
                  )}
                </dd>
              </div>
              {(interview.scheduledAt || interview.startedAt) && (
                <div className="flex gap-3">
                  <dt className="sr-only">When</dt>
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-foreground-tertiary" aria-hidden />
                  <dd className="text-foreground-secondary">
                    {interview.startedAt
                      ? `Started ${formatDateTime(interview.startedAt)}`
                      : `Scheduled ${formatDateTime(interview.scheduledAt as string)}`}
                    {interview.endedAt && <span className="block">Ended {formatDateTime(interview.endedAt)}</span>}
                  </dd>
                </div>
              )}
              {interview.location && (
                <div className="flex gap-3">
                  <dt className="sr-only">Location</dt>
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-foreground-tertiary" aria-hidden />
                  <dd className="text-foreground-secondary">{interview.location}</dd>
                </div>
              )}
            </dl>
          </Panel>

          <Panel title="Consent">{consent ? <ConsentSummary consent={consent} /> : <LoadingState rows={2} />}</Panel>
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this interview?"
        description="It will be marked cancelled and removed from the interviewer's open work. Recordings already uploaded are kept."
        confirmLabel="Cancel interview"
        cancelLabel="Keep it"
        variant="danger"
        loading={updateStatus.isPending}
        onConfirm={async () => {
          await updateStatus.mutateAsync({ id: interviewId, status: 'CANCELLED' }).catch(() => undefined);
          setConfirmCancel(false);
        }}
      />
    </div>
  );
}
