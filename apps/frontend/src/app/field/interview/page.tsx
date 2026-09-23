'use client';

import { Suspense, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarClock, Check, CheckCircle2, CloudOff, MapPin, ShieldCheck, ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FieldRecorder } from '@/components/field/field-recorder';
import { RecordingRow } from '@/components/field/recording-row';
import { consentPermitsRecording, useFieldInterviews } from '@/hooks/use-field-interviews';
import { useUpdateInterviewStatus } from '@/hooks/use-interviews';
import { API } from '@/lib/api-client';
import type { CachedInterview } from '@/lib/field/types';
import { useAuthStore } from '@/stores/auth-store';
import { useFieldOutbox } from '@/stores/field-outbox-store';
import { cn, formatDateTime } from '@/lib/utils';

type StepState = 'done' | 'current' | 'todo' | 'blocked';

function StepRail({ steps }: { steps: { label: string; state: StepState }[] }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Interview steps">
      {steps.map((step, i) => (
        <li key={step.label} className="flex flex-1 flex-col gap-1.5">
          <span
            aria-hidden
            className={cn(
              'h-1.5 rounded-full',
              step.state === 'done' && 'bg-navy dark:bg-primary-500',
              step.state === 'current' && 'bg-lemon-600',
              step.state === 'todo' && 'bg-field-line',
              step.state === 'blocked' && 'bg-error',
            )}
          />
          <span className={cn('text-[12px] font-semibold', step.state === 'todo' ? 'text-foreground-tertiary' : 'text-foreground')}>
            {i + 1}. {step.label}
            <span className="sr-only">
              {step.state === 'done' ? ', done' : step.state === 'current' ? ', current step' : step.state === 'blocked' ? ', blocked' : ', not started'}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">{title}</h2>
      {children}
    </section>
  );
}

function InterviewWorkflow() {
  const id = useSearchParams().get('id') ?? '';
  const userId = useAuthStore((s) => s.user?.id);
  const { interviews, source, isLoading: listLoading } = useFieldInterviews();
  const recordings = useFieldOutbox((s) => s.recordings);
  const online = useFieldOutbox((s) => s.online);
  const updateStatus = useUpdateInterviewStatus();

  const pendingAll = useFieldOutbox((s) => s.pending);
  const fromList = interviews.find((i) => i.id === id);
  // Started on this phone; may not exist on the server yet.
  const pending = pendingAll.find((p) => p.id === id);
  const notOnServerYet = !!pending && pending.status !== 'synced';
  // Just created and not yet in the list: ask the API directly (online only).
  const direct = useQuery({
    queryKey: ['field', 'interview', id],
    queryFn: async () => (await API.interviews.get(id)).data.data,
    enabled: !!id && !fromList && !pending && !listLoading,
    retry: 0,
  });

  const interview: CachedInterview | undefined = useMemo(() => {
    if (fromList) return fromList;
    if (pending) {
      return {
        id: pending.id,
        status: 'IN_PROGRESS',
        location: pending.location,
        participantId: pending.participantId,
        participantName: pending.participant.displayName,
        projectId: pending.projectId,
        consent: {
          id: pending.consentId,
          method: pending.consent.method,
          allowRecording: pending.consent.allowRecording,
        },
      };
    }
    const d = direct.data;
    if (!d) return undefined;
    return {
      id: d.id,
      status: d.status,
      scheduledAt: d.scheduledAt,
      location: d.location,
      notes: d.notes,
      participantId: d.participantId,
      participantName: d.participant?.displayName,
      consent: d.consent ?? null,
      recordingCount: d._count?.recordings,
    };
  }, [fromList, pending, direct.data]);

  const onDevice = recordings.filter((r) => r.interviewId === id);
  const pendingHere = onDevice.filter((r) => r.status !== 'uploaded').length;

  const markStarted = useCallback(() => {
    if (interview?.status === 'SCHEDULED' && !pending && navigator.onLine) {
      updateStatus.mutate({ id, status: 'IN_PROGRESS' });
    }
  }, [id, interview?.status, pending, updateStatus]);

  if (!id) {
    return <p className="text-[16px] text-foreground-secondary">No interview selected.</p>;
  }

  if ((listLoading && !pending) || (!interview && direct.isLoading)) {
    return (
      <div className="space-y-4" aria-label="Loading interview">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (!interview || !userId) {
    return (
      <div className="rounded-2xl bg-field-card p-6 text-center ring-1 ring-field-line">
        <h1 className="text-[20px] font-semibold text-foreground">Interview not available</h1>
        <p className="mt-2 text-[15px] text-foreground-secondary">
          {source === 'cached' || !online
            ? 'This interview was not saved on this phone before it went offline. Connect once to download your assignments.'
            : 'It may have been reassigned or cancelled. Check with your research lead.'}
        </p>
        <Button size="lg" variant="secondary" className="mt-5" asChild>
          <Link href="/field">Back to today</Link>
        </Button>
      </div>
    );
  }

  const permitted = consentPermitsRecording(interview.consent);
  const closed = interview.status === 'COMPLETED' || interview.status === 'CANCELLED';
  // A recording still being captured doesn't move the interview on to Upload.
  const captured = onDevice.filter((r) => r.status !== 'recording');
  const recordingNow = onDevice.some((r) => r.status === 'recording');
  const hasAudio = captured.length > 0 || (interview.recordingCount ?? 0) > 0;
  const allUploaded = hasAudio && pendingHere === 0;

  const steps: { label: string; state: StepState }[] = [
    { label: 'Prepare', state: 'done' },
    { label: 'Consent', state: permitted ? 'done' : 'blocked' },
    { label: 'Record', state: !permitted ? 'todo' : hasAudio && !recordingNow ? 'done' : 'current' },
    { label: 'Upload', state: allUploaded ? 'done' : hasAudio && !recordingNow ? 'current' : 'todo' },
  ];

  return (
    <div className="space-y-7">
      <div>
        <Link href="/field" className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-[15px] font-medium text-foreground-secondary">
          <ArrowLeft className="h-5 w-5" aria-hidden /> Today
        </Link>
        <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
          {interview.participantName ?? 'Interview'}
        </h1>
        <div className="mt-2 space-y-1 text-[15px] text-foreground-secondary">
          {interview.scheduledAt && (
            <p className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" aria-hidden /> {formatDateTime(interview.scheduledAt)}
            </p>
          )}
          {interview.location && (
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4" aria-hidden /> {interview.location}
            </p>
          )}
        </div>
      </div>

      <StepRail steps={steps} />

      {pending?.status === 'blocked' && (
        <p className="rounded-2xl bg-error-bg px-4 py-3.5 text-[15px] text-foreground" role="alert">
          The server did not accept this interview: {pending.lastError}. Recordings stay on this phone. Tell your research lead.
        </p>
      )}

      {source === 'cached' && (
        <p className="flex items-start gap-2.5 rounded-2xl bg-field-card px-4 py-3 text-[15px] text-foreground ring-1 ring-field-line" role="status">
          <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-foreground-tertiary" aria-hidden />
          Offline. Details are from your last connection; recording works normally.
        </p>
      )}

      {interview.notes && (
        <Section title="Briefing">
          <p className="whitespace-pre-wrap rounded-2xl bg-field-card px-4 py-3.5 text-[16px] leading-relaxed text-foreground ring-1 ring-field-line">
            {interview.notes}
          </p>
        </Section>
      )}

      <Section title="Consent">
        <div
          className={cn(
            'flex items-start gap-3 rounded-2xl px-4 py-3.5',
            permitted ? 'bg-lemon-100 text-lemon-900 dark:bg-lemon-900/30 dark:text-lemon-200' : 'bg-error-bg text-foreground',
          )}
        >
          {permitted ? <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0" aria-hidden /> : <ShieldOff className="mt-0.5 h-6 w-6 shrink-0 text-error" aria-hidden />}
          <div>
            <p className="text-[16px] font-semibold">
              {permitted ? 'Recording is consented' : interview.consent?.withdrawnAt ? 'Consent was withdrawn' : 'Consent does not allow recording'}
            </p>
            <p className="mt-0.5 text-[15px] opacity-90">
              {permitted
                ? `${interview.consent?.method ? interview.consent.method.charAt(0) + interview.consent.method.slice(1).toLowerCase() + ' consent. ' : ''}Confirm the participant is still happy to be recorded before you start.`
                : 'Do not record this interview. Take written notes if your protocol allows, and tell your research lead.'}
            </p>
          </div>
        </div>
      </Section>

      {permitted && !closed && (
        <Section title="Record">
          <FieldRecorder userId={userId} interviewId={interview.id} participantName={interview.participantName} onFirstStart={markStarted} />
        </Section>
      )}

      {onDevice.length > 0 && (
        <Section title="On this phone">
          <ul className="space-y-2">
            {onDevice.map((r) => (
              <RecordingRow key={r.id} recording={r} compact />
            ))}
          </ul>
        </Section>
      )}

      {!closed && hasAudio && (
        <div className="rounded-2xl bg-field-card p-4 ring-1 ring-field-line">
          <Button
            size="xl"
            className="w-full"
            disabled={!online || notOnServerYet || interview.status !== 'IN_PROGRESS'}
            loading={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ id, status: 'COMPLETED' })}
          >
            <Check className="h-5 w-5" aria-hidden /> Finish interview
          </Button>
          <p className="mt-2 text-center text-[14px] text-foreground-secondary">
            {!online
              ? 'Connect to mark the interview finished. Your recordings are safe on this phone.'
              : notOnServerYet
                ? 'Sending this interview to the server first…'
              : interview.status !== 'IN_PROGRESS'
                ? 'Available once the interview has started.'
                : 'Recordings still on this phone keep uploading after you finish.'}
          </p>
        </div>
      )}

      {closed && (
        <p className="flex items-center gap-2.5 rounded-2xl bg-success-bg px-4 py-3.5 text-[16px] font-medium text-foreground">
          <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
          {interview.status === 'COMPLETED' ? 'This interview is finished.' : 'This interview was cancelled.'}
        </p>
      )}
    </div>
  );
}

export default function FieldInterviewPage() {
  return (
    <Suspense>
      <InterviewWorkflow />
    </Suspense>
  );
}
