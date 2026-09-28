'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet, Link2, ListChecks, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { downloadGuideTemplate, useGuides } from '@/hooks/use-guides';
import { useResearchProjects } from '@/hooks/use-research-projects';
import { API } from '@/lib/api-client';
import { INTERVIEW_LANGUAGES, languageLabel } from '@/lib/languages';
import { cn } from '@/lib/utils';
import type { ImportProblem } from '@/types/guide';
import type { RespondentLink } from '@/types/respondent-link';

type Source = 'upload' | 'existing';
type Audience = 'many' | 'one';

/**
 * A new self-interview link in one form: the project, the questions (an
 * approved guide, or a CSV/Excel file that becomes the project's approved
 * KII guide), and who it is for. On success the caller gets the link to
 * copy and share.
 */
export function CreateLinkDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (link: RespondentLink) => void;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: projectPage } = useResearchProjects();
  const projects = useMemo(() => projectPage?.items ?? [], [projectPage]);

  const [projectId, setProjectId] = useState('');
  const [source, setSource] = useState<Source>('upload');
  const [guideId, setGuideId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [intro, setIntro] = useState('');
  const [language, setLanguage] = useState('en');
  const [audience, setAudience] = useState<Audience>('many');
  const [respondentName, setRespondentName] = useState('');
  const [expiresOn, setExpiresOn] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [problems, setProblems] = useState<ImportProblem[]>([]);

  const { data: guides = [], isFetched: guidesFetched } = useGuides(projectId ? { projectId } : undefined);
  const approved = useMemo(
    () => guides.filter((g) => g.status === 'APPROVED' && (!g.projectId || g.projectId === projectId)),
    [guides, projectId],
  );

  useEffect(() => {
    if (!open) return;
    setProjectId((p) => p || (projects.length === 1 ? projects[0].id : ''));
  }, [open, projects]);
  // Once per chosen project (not on every refetch): offer its existing
  // approved guide first, if it has one.
  const initialisedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!projectId || !guidesFetched || initialisedFor.current === projectId) return;
    initialisedFor.current = projectId;
    setGuideId(approved[0]?.id ?? '');
    setSource(approved.length > 0 ? 'existing' : 'upload');
  }, [projectId, guidesFetched, approved]);

  // A file already imported (and perhaps approved) in an attempt that then
  // failed further on: a retry reuses it rather than importing it twice.
  const imported = useRef<{ file: File; projectId: string; id: string; approved: boolean } | null>(null);

  const reset = () => {
    setSource('upload');
    setGuideId('');
    setFile(null);
    setTitle('');
    setIntro('');
    setLanguage('en');
    setAudience('many');
    setRespondentName('');
    setExpiresOn('');
    setMessage(null);
    setProblems([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const ready =
    !!projectId &&
    title.trim().length >= 2 &&
    (source === 'upload' ? !!file : !!guideId) &&
    (audience === 'many' || respondentName.trim().length > 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setMessage(null);
    setProblems([]);
    try {
      let questionSetId = guideId;
      if (source === 'upload' && file) {
        let done = imported.current;
        if (!done || done.file !== file || done.projectId !== projectId) {
          setBusy('Reading your questions…');
          const data = new FormData();
          data.append('file', file);
          data.append('title', title.trim());
          data.append('interviewType', 'KII');
          data.append('projectId', projectId);
          // Kept for links: it never replaces the field teams' guide.
          data.append('linkOnly', 'true');
          const guide = (await API.guides.import(data)).data.data;
          done = imported.current = { file, projectId, id: guide.id, approved: false };
        }
        if (!done.approved) {
          setBusy('Approving the questions…');
          await API.guides.approve(done.id);
          done.approved = true;
        }
        questionSetId = done.id;
        qc.invalidateQueries({ queryKey: ['guides'] });
      }
      setBusy('Creating the link…');
      const expiresAt = expiresOn ? new Date(`${expiresOn}T23:59:59`).toISOString() : undefined;
      const link = (
        await API.respondentLinks.create({
          projectId,
          questionSetId,
          title: title.trim(),
          intro: intro.trim() || undefined,
          interviewType: 'KII',
          language,
          ...(audience === 'one' && { respondentName: respondentName.trim(), maxResponses: 1 }),
          ...(expiresAt && { expiresAt }),
        })
      ).data.data;
      qc.invalidateQueries({ queryKey: ['respondent-links'] });
      imported.current = null;
      initialisedFor.current = null;
      reset();
      onCreated(link);
    } catch (err) {
      const e2 = err as { message?: string; details?: unknown };
      setMessage(e2.message ?? 'The link could not be created');
      setProblems(Array.isArray(e2.details) ? (e2.details as ImportProblem[]) : []);
    } finally {
      setBusy(null);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New self-interview link</DialogTitle>
          <DialogDescription>
            Respondents open the link on their phone or computer, agree to take part, and record their answers to each question.
            They don’t need an account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <Field id="l-project" label="Project">
            <NativeSelect id="l-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
              <option value="">Choose a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </Field>

          <fieldset disabled={!projectId} className="space-y-3 disabled:opacity-60">
            <legend className="mb-1.5 text-[14px] font-medium text-foreground">Questions</legend>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Where the questions come from">
              {(
                [
                  { value: 'upload', icon: Upload, label: 'Upload a file', hint: 'CSV or Excel, one question per row' },
                  { value: 'existing', icon: ListChecks, label: 'Use an approved guide', hint: `${approved.length} available` },
                ] as const
              ).map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={source === o.value}
                  disabled={o.value === 'existing' && approved.length === 0}
                  onClick={() => setSource(o.value)}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    source === o.value ? 'border-primary bg-primary-50 ring-1 ring-primary' : 'border-border-subtle hover:border-border-strong',
                  )}
                >
                  <o.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-700" aria-hidden />
                  <span>
                    <span className="block text-[14px] font-medium text-foreground">{o.label}</span>
                    <span className="block text-[12.5px] text-foreground-tertiary">{o.hint}</span>
                  </span>
                </button>
              ))}
            </div>

            {source === 'upload' ? (
              <div className="space-y-2">
                <input
                  id="l-file"
                  ref={fileRef}
                  type="file"
                  aria-label="Questions file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-[14px] text-foreground-secondary file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-primary-700"
                />
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-foreground-tertiary">
                  <FileSpreadsheet className="h-4 w-4" aria-hidden /> Template with examples:
                  <button type="button" className="font-medium text-foreground-link hover:underline" onClick={() => downloadGuideTemplate('xlsx')}>
                    Excel
                  </button>
                  ·
                  <button type="button" className="font-medium text-foreground-link hover:underline" onClick={() => downloadGuideTemplate('csv')}>
                    CSV
                  </button>
                </p>
                <p className="text-[13px] text-foreground-tertiary">
                  Saved under Guides for this link only. Field teams’ guides are not changed.
                </p>
              </div>
            ) : (
              <NativeSelect id="l-guide" aria-label="Approved guide" value={guideId} onChange={(e) => setGuideId(e.target.value)}>
                {approved.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} · v{g.version} · {g.interviewType} · {g._count?.questions ?? 0} questions
                    {g.projectId ? '' : ' · all projects'}
                    {g.linkOnly ? ' · for links' : ''}
                  </option>
                ))}
              </NativeSelect>
            )}
          </fieldset>

          <Field id="l-title" label="Title respondents see" hint="For example: “Water governance in Kano: key informant interview”">
            <Input id="l-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} maxLength={200} />
          </Field>

          <Field id="l-intro" label="Welcome message" optional hint="Who you are, why you are asking, and roughly how long it takes.">
            <Textarea id="l-intro" value={intro} onChange={(e) => setIntro(e.target.value)} maxLength={2000} rows={3} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="l-lang" label="Respondents will speak">
              <NativeSelect id="l-lang" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {INTERVIEW_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {languageLabel(l.code)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="l-expires" label="Closes after" optional>
              <Input id="l-expires" type="date" min={today} value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
            </Field>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1.5 text-[14px] font-medium text-foreground">Who is it for?</legend>
            <label className="flex items-start gap-2.5 text-[14px]">
              <input type="radio" name="aud" className="mt-1" checked={audience === 'many'} onChange={() => setAudience('many')} />
              <span>
                Anyone with the link
                <span className="block text-[12.5px] text-foreground-tertiary">Share one link with many respondents; each gives their own name.</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-[14px]">
              <input type="radio" name="aud" className="mt-1" checked={audience === 'one'} onChange={() => setAudience('one')} />
              <span>
                One named person
                <span className="block text-[12.5px] text-foreground-tertiary">Their name is filled in, and the link closes after they submit.</span>
              </span>
            </label>
            {audience === 'one' && (
              <Input
                aria-label="Respondent’s name"
                placeholder="Respondent’s name"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                maxLength={200}
                className="mt-1"
              />
            )}
          </fieldset>

          {message && (
            <div className="rounded-lg bg-error-bg px-4 py-3 text-[14px] text-foreground" role="alert">
              <p className="font-medium">{message}</p>
              {problems.length > 0 && (
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-[13px]">
                  {problems.map((p, i) => (
                    <li key={i}>
                      <span className="font-semibold tabular-nums">Row {p.row}:</span> {p.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            {busy && (
              <span className="mr-auto text-[13px] text-foreground-secondary" role="status">
                {busy}
              </span>
            )}
            <Button type="button" variant="ghost" disabled={!!busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={!!busy} disabled={!ready}>
              <Link2 className="h-4 w-4" aria-hidden /> Create link
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
