'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldConsentForm } from '@/components/field/field-consent-form';
import { useFieldInterviews } from '@/hooks/use-field-interviews';
import { useAuthStore } from '@/stores/auth-store';
import { useFieldOutbox } from '@/stores/field-outbox-store';
import { cn } from '@/lib/utils';

type Step = 'who' | 'consent';

/**
 * Start an interview on site: who → consent → record. The participant,
 * their consent and the interview are created together on the phone (no
 * connection needed) and on the server at the next sync — before any of
 * the audio, so consent is always on record first.
 */
function StartInterview() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = useAuthStore((s) => s.user?.id);
  const online = useFieldOutbox((s) => s.online);
  const addPending = useFieldOutbox((s) => s.addPending);
  const { projects, projectsLoading } = useFieldInterviews();

  const [step, setStep] = useState<Step>('who');
  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [name, setName] = useState('');
  const [ref, setRef] = useState('');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const chosenProject = projects.find((p) => p.id === projectId) ?? (projects.length === 1 ? projects[0] : undefined);

  const toConsent = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!chosenProject) next.project = 'Choose the project this interview belongs to.';
    if (!name.trim()) next.name = 'Enter a name, pseudonym or code.';
    setErrors(next);
    if (Object.keys(next).length === 0) setStep('consent');
  };

  if (!userId) return null;

  if (!projectsLoading && projects.length === 0) {
    return (
      <div className="rounded-2xl bg-field-card p-6 text-center ring-1 ring-field-line">
        <h1 className="text-[20px] font-semibold text-foreground">No projects assigned yet</h1>
        <p className="mt-2 text-[15px] text-foreground-secondary">
          {online
            ? 'Ask your research lead to add you to a project. It appears here as soon as they do.'
            : 'Connect once so this phone can download the projects you are assigned to.'}
        </p>
        <Button size="lg" variant="secondary" className="mt-5" asChild>
          <Link href="/field">Back to projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => (step === 'consent' ? setStep('who') : router.push('/field'))}
          className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-2 text-[15px] font-medium text-foreground-secondary"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden /> {step === 'consent' ? 'Participant' : 'Projects'}
        </button>
        <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
          {step === 'who' ? 'New interview' : 'Record consent'}
        </h1>
        <ol className="mt-4 flex gap-1.5" aria-label="Steps">
          {['Participant', 'Consent', 'Record'].map((label, i) => {
            const done = (step === 'consent' && i === 0);
            const current = (step === 'who' && i === 0) || (step === 'consent' && i === 1);
            return (
              <li key={label} className="flex flex-1 flex-col gap-1.5">
                <span aria-hidden className={cn('h-1.5 rounded-full', done ? 'bg-navy dark:bg-primary-500' : current ? 'bg-lemon-600' : 'bg-field-line')} />
                <span className={cn('text-[12px] font-semibold', done || current ? 'text-foreground' : 'text-foreground-tertiary')}>
                  {i + 1}. {label}
                  <span className="sr-only">{done ? ', done' : current ? ', current step' : ''}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {!online && (
        <p className="flex items-start gap-2.5 rounded-2xl bg-navy px-4 py-3.5 text-[15px] text-white" role="status">
          <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-lemon" aria-hidden />
          Offline is fine. Everything is saved on this phone and sent when you reconnect.
        </p>
      )}

      {step === 'who' ? (
        <form onSubmit={toConsent} noValidate className="space-y-6">
          {projects.length > 1 && (
            <fieldset aria-describedby={errors.project ? 'project-error' : undefined}>
              <legend className="mb-2 text-[16px] font-semibold text-foreground">Project</legend>
              <div className="space-y-2" role="radiogroup">
                {projects.map((p) => {
                  const selected = projectId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setProjectId(p.id)}
                      className={cn(
                        'flex min-h-control-field w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-[16px] font-semibold ring-1 transition-colors',
                        selected ? 'bg-navy text-white ring-navy' : 'bg-field-card text-foreground ring-field-line',
                      )}
                    >
                      <span>
                        {p.name}
                        {p.method && <span className={cn('ml-2 text-[13px] font-medium', selected ? 'text-lemon' : 'text-foreground-tertiary')}>{p.method}</span>}
                      </span>
                      {selected && <Check className="h-5 w-5 text-lemon" aria-hidden />}
                    </button>
                  );
                })}
              </div>
              {errors.project && (
                <p id="project-error" className="mt-1.5 text-[14px] text-foreground-error">
                  {errors.project}
                </p>
              )}
            </fieldset>
          )}
          {projects.length === 1 && (
            <p className="rounded-2xl bg-field-card px-4 py-3 text-[15px] text-foreground-secondary ring-1 ring-field-line">
              Project: <span className="font-semibold text-foreground">{projects[0].name}</span>
            </p>
          )}

          <div>
            <label htmlFor="p-name" className="mb-1.5 block text-[16px] font-semibold text-foreground">
              Participant name or code
            </label>
            <Input
              id="p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-control-lg"
              autoComplete="off"
              error={!!errors.name}
              aria-describedby={errors.name ? 'p-name-error' : 'p-name-hint'}
              maxLength={200}
            />
            {errors.name ? (
              <p id="p-name-error" className="mt-1.5 text-[14px] text-foreground-error">
                {errors.name}
              </p>
            ) : (
              <p id="p-name-hint" className="mt-1.5 text-[14px] text-foreground-secondary">
                Use a code such as “P-014” if your protocol avoids real names.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="p-ref" className="mb-1.5 block text-[16px] font-semibold text-foreground">
                Roster ID <span className="font-normal text-foreground-tertiary">(optional)</span>
              </label>
              <Input id="p-ref" value={ref} onChange={(e) => setRef(e.target.value)} className="h-control-lg" autoComplete="off" maxLength={200} />
            </div>
            <div>
              <label htmlFor="p-loc" className="mb-1.5 block text-[16px] font-semibold text-foreground">
                Location <span className="font-normal text-foreground-tertiary">(optional)</span>
              </label>
              <Input id="p-loc" value={location} onChange={(e) => setLocation(e.target.value)} className="h-control-lg" maxLength={200} />
            </div>
          </div>

          <Button type="submit" size="xl" className="w-full" disabled={projectsLoading}>
            Continue to consent
          </Button>
        </form>
      ) : (
        <FieldConsentForm
          isSubmitting={saving}
          onCancel={() => setStep('who')}
          onSubmit={async (consent) => {
            if (!chosenProject) return;
            setSaving(true);
            const id = crypto.randomUUID();
            await addPending({
              id,
              participantId: crypto.randomUUID(),
              consentId: crypto.randomUUID(),
              userId,
              projectId: chosenProject.id,
              projectName: chosenProject.name,
              participant: { displayName: name.trim(), externalRef: ref.trim() || undefined },
              consent: {
                version: consent.version,
                method: consent.method,
                allowRecording: !!consent.allowRecording,
                allowTranscription: !!consent.allowTranscription,
                allowAiAnalysis: !!consent.allowAiAnalysis,
                allowQuotation: !!consent.allowQuotation,
                allowPublication: !!consent.allowPublication,
                capturedAt: new Date().toISOString(),
              },
              location: location.trim() || undefined,
              createdAt: new Date().toISOString(),
              status: 'pending',
              attempts: 0,
            });
            router.replace(`/field/interview?id=${id}`);
          }}
        />
      )}
    </div>
  );
}

export default function FieldStartInterviewPage() {
  return (
    <Suspense>
      <StartInterview />
    </Suspense>
  );
}
