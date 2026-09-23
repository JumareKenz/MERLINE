'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AudioLines, CalendarClock, MapPin, UserRound, Languages, Tag, Trash2 } from 'lucide-react';
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
import { InterviewReportCard } from '@/components/analysis/interview-report-card';
import { InterviewGuideLog } from '@/components/guides/interview-guide-log';
import { API } from '@/lib/api-client';
import { interviewTypeLabel } from '@/types/research-project';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useInterview, useRecordings, useUpdateInterviewStatus } from '@/hooks/use-interviews';
import { useConsent } from '@/hooks/use-consents';
import { useTranscriptsForInterview } from '@/hooks/use-transcripts';
import { useSession } from '@/hooks/use-session';
import { languageLabel } from '@/lib/languages';
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
  // Playback and transcripts are administrator-only; don't ask for what the API will refuse.
  const canPlay = session.can('view.recordings');
  const { data: recordingsData, isLoading: recordingsLoading } = useRecordings(canPlay ? interviewId : '');
  const { data: transcriptsData } = useTranscriptsForInterview(session.can('view.transcripts') ? interviewId : '');
  const updateStatus = useUpdateInterviewStatus();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<null | { kind: 'interview' } | { kind: 'recording'; id: string; name: string }>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

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
              {session.can('delete.interviews') && (
                <Button variant="ghost" onClick={() => setConfirmDelete({ kind: 'interview' })} aria-label="Delete interview">
                  <Trash2 className="h-4 w-4" aria-hidden />
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
            {!canPlay ? (
              <EmptyState
                size="inline"
                icon={<AudioLines />}
                title={
                  interview._count?.recordings
                    ? `${interview._count.recordings} recording${interview._count.recordings === 1 ? '' : 's'} on file`
                    : 'No audio yet'
                }
                description="Listening to recordings and reading transcripts is limited to administrators."
              />
            ) : recordingsLoading ? (
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
                    {session.can('delete.recordings') && (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete({ kind: 'recording', id: recording.id, name: recording.originalName })}
                        className="inline-flex items-center gap-1 text-[12.5px] text-foreground-tertiary hover:text-foreground-error"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete recording
                      </button>
                    )}
                    {canViewTranscripts && (
                      <TranscriptStatus
                        interviewId={interviewId}
                        recording={recording}
                        // Newest first: the latest attempt for this recording.
                        transcript={transcripts.find((t) => t.mediaId === recording.id)}
                        interviewLanguage={interview.language}
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

          {interview.questionSetId && (
            <Panel title="Interview guide">
              <InterviewGuideLog interviewId={interviewId} language={interview.language} />
            </Panel>
          )}

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
              <div className="flex gap-3">
                <dt className="sr-only">Type</dt>
                <Tag className="mt-0.5 h-4 w-4 shrink-0 text-foreground-tertiary" aria-hidden />
                <dd className="text-foreground-secondary">{interviewTypeLabel(interview.type)}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="sr-only">Language</dt>
                <Languages className="mt-0.5 h-4 w-4 shrink-0 text-foreground-tertiary" aria-hidden />
                <dd className="text-foreground-secondary">
                  {languageLabel(interview.language) ?? 'Language not recorded (detected automatically)'}
                </dd>
              </div>
            </dl>
          </Panel>

          {canViewTranscripts && (
            <Panel title="Interview report">
              <InterviewReportCard
                interviewId={interviewId}
                hasTranscript={transcripts.some((t) => t.status === 'COMPLETED' && (t._count?.segments ?? 1) > 0)}
                aiAllowed={!!consent?.allowAiAnalysis && !consent?.withdrawnAt}
              />
            </Panel>
          )}

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
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title={confirmDelete?.kind === 'recording' ? `Delete ${confirmDelete.name}?` : 'Delete this interview?'}
        description={
          confirmDelete?.kind === 'recording'
            ? 'The recording and its transcripts move to the Trash. An administrator can restore them.'
            : 'The interview moves to the Trash with its recordings, transcripts and reports. The consent record is kept. An administrator can restore it from Settings › Trash.'
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={async () => {
          if (!confirmDelete) return;
          setDeleting(true);
          try {
            if (confirmDelete.kind === 'interview') {
              await API.interviews.delete(interviewId);
              toast.success('Interview moved to the Trash');
              router.push(interview.projectId ? `/projects/${interview.projectId}` : '/interviews');
            } else {
              await API.interviews.deleteRecording(interviewId, confirmDelete.id);
              toast.success('Recording moved to the Trash');
              queryClient.invalidateQueries({ queryKey: ['interviews', 'recordings', interviewId] });
              queryClient.invalidateQueries({ queryKey: ['transcripts'] });
            }
          } catch (e) {
            toast.error((e as { message?: string })?.message ?? 'It could not be deleted');
          } finally {
            setDeleting(false);
            setConfirmDelete(null);
          }
        }}
      />
    </div>
  );
}
