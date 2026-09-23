'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { Field, describedBy } from '@/components/ui/field';
import { useCreateInterview } from '@/hooks/use-interviews';
import { useParticipants } from '@/hooks/use-participants';
import { useResearchProjects } from '@/hooks/use-research-projects';
import { API } from '@/lib/api-client';
import { INTERVIEW_LANGUAGES } from '@/lib/languages';

/**
 * Allocates an interview to a field interviewer. The API requires a consent
 * record for the participant before any interview can exist, so the form
 * only offers participants who already have one — and says how to get one
 * rather than failing on submit.
 */
export default function NewAssignmentPage() {
  const router = useRouter();
  const create = useCreateInterview();
  const members = useQuery({
    queryKey: ['interviews', 'interviewers'],
    queryFn: async () => (await API.interviews.interviewers()).data.data,
  });
  const projects = useResearchProjects();

  const [projectId, setProjectId] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [consentId, setConsentId] = useState('');
  const [interviewerId, setInterviewerId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [language, setLanguage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const participants = useParticipants(projectId || undefined);
  const consents = useQuery({
    queryKey: ['consents', 'participant', participantId],
    queryFn: async () => (await API.consents.listForParticipant(participantId)).data.data,
    enabled: !!participantId,
  });

  // Field interviewers first; anyone active can technically be assigned.
  const activeMembers = useMemo(
    () => [...(members.data ?? [])].sort((a, b) => Number(b.isFieldInterviewer) - Number(a.isFieldInterviewer)),
    [members.data],
  );

  const usableConsents = (consents.data ?? []).filter((c) => !c.withdrawnAt);
  const participantList = participants.data?.data?.data ?? [];

  const validate = () => {
    const next: Record<string, string> = {};
    if (!participantId) next.participant = 'Choose who will be interviewed.';
    if (participantId && !consentId) next.consent = 'Choose the consent record this interview relies on.';
    if (!interviewerId) next.interviewer = 'Choose who will conduct it.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const result = await create
      .mutateAsync({
        participantId,
        consentId,
        interviewerId,
        projectId: projectId || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        language: language || undefined,
      })
      .catch(() => null);
    if (result) router.push('/assignments');
  };

  const chosenConsent = usableConsents.find((c) => c.id === consentId);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Book an interview"
        description="Optional. For an interview arranged in advance with someone already registered and consented. Most interviews are started on site by the field worker, who records consent there."
      />

      <form onSubmit={submit} noValidate className="space-y-6 rounded-xl border border-border-subtle bg-background-elevated p-5 shadow-soft sm:p-7">
        <Field id="project" label="Project" optional hint="Narrows the participant list and files the interview under the project.">
          <NativeSelect
            id="project"
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setParticipantId('');
              setConsentId('');
            }}
            aria-describedby="project-hint"
          >
            <option value="">All projects</option>
            {(projects.data?.items ?? [])
              .filter((p) => p.status !== 'archived')
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </NativeSelect>
        </Field>

        <Field id="participant" label="Participant" error={errors.participant}>
          <NativeSelect
            id="participant"
            value={participantId}
            error={!!errors.participant}
            aria-describedby={describedBy('participant', { error: errors.participant })}
            onChange={(e) => {
              setParticipantId(e.target.value);
              setConsentId('');
            }}
            disabled={participants.isLoading}
          >
            <option value="">{participants.isLoading ? 'Loading participants…' : 'Choose a participant'}</option>
            {participantList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
                {p.externalRef ? ` · ${p.externalRef}` : ''}
              </option>
            ))}
          </NativeSelect>
          {!participants.isLoading && participantList.length === 0 && (
            <p className="mt-2 text-[13px] text-foreground-secondary">
              No participants {projectId ? 'in this project ' : ''}yet.{' '}
              <Link href="/participants/new" className="font-medium text-foreground-link hover:underline">
                Register a participant
              </Link>
            </p>
          )}
        </Field>

        {participantId && (
          <Field id="consent" label="Consent on file" error={errors.consent}>
            {consents.isLoading ? (
              <p className="text-[14px] text-foreground-secondary">Checking consent…</p>
            ) : usableConsents.length === 0 ? (
              <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning-bg p-3.5 text-[14px] text-foreground">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                <p>
                  This participant has no active consent record, and an interview cannot exist without one.{' '}
                  <Link href={`/participants/${participantId}`} className="font-medium text-foreground-link hover:underline">
                    Record consent
                  </Link>{' '}
                  first, or let the field interviewer capture it on the day.
                </p>
              </div>
            ) : (
              <>
                <NativeSelect
                  id="consent"
                  value={consentId}
                  error={!!errors.consent}
                  aria-describedby={describedBy('consent', { error: errors.consent })}
                  onChange={(e) => setConsentId(e.target.value)}
                >
                  <option value="">Choose a consent record</option>
                  {usableConsents.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.version} · {c.method.toLowerCase()} · {c.allowRecording ? 'recording allowed' : 'no recording'}
                    </option>
                  ))}
                </NativeSelect>
                {chosenConsent && !chosenConsent.allowRecording && (
                  <p className="mt-2 text-[13px] text-foreground-warning">
                    This consent does not permit recording. The interviewer will not be able to record audio.
                  </p>
                )}
              </>
            )}
          </Field>
        )}

        <Field id="interviewer" label="Field interviewer" error={errors.interviewer}>
          <NativeSelect
            id="interviewer"
            value={interviewerId}
            error={!!errors.interviewer}
            aria-describedby={describedBy('interviewer', { error: errors.interviewer })}
            onChange={(e) => setInterviewerId(e.target.value)}
            disabled={members.isLoading}
          >
            <option value="">{members.isLoading ? 'Loading team…' : 'Choose an interviewer'}</option>
            {activeMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
                {m.isFieldInterviewer ? ' · field interviewer' : ''}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="when" label="Scheduled for" optional>
            <Input id="when" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </Field>
          <Field id="where" label="Location" optional>
            <Input id="where" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} placeholder="e.g. Ward 4 health post" />
          </Field>
        </div>

        <Field id="language" label="Language of the interview" optional hint="Used to transcribe the recording. Always set it for Hausa: it is not detected reliably.">
          <NativeSelect id="language" value={language} onChange={(e) => setLanguage(e.target.value)} aria-describedby="language-hint">
            <option value="">Not sure (detect automatically)</option>
            {INTERVIEW_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field id="notes" label="Briefing notes" optional hint="Shown to the interviewer on the preparation screen.">
          <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} aria-describedby="notes-hint" />
        </Field>

        <div className="flex flex-col-reverse gap-2 border-t border-border-subtle pt-6 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => router.push('/assignments')}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            Book interview
          </Button>
        </div>
      </form>
    </div>
  );
}
