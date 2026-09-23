'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Archive, CheckCircle2, History, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { Field } from '@/components/ui/field';
import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import { QuestionCard } from '@/components/guides/question-card';
import { useGuideAction, useSaveGuide } from '@/hooks/use-guides';
import { useResearchProjects } from '@/hooks/use-research-projects';
import { useSession } from '@/hooks/use-session';
import { INTERVIEW_LANGUAGES } from '@/lib/languages';
import { formatDate } from '@/lib/utils';
import type { Guide, GuideQuestion, SaveGuideInput } from '@/types/guide';
import { INTERVIEW_TYPE_LABELS } from '@/types/research-project';
import { toast } from 'sonner';

const blankQuestion = (): GuideQuestion => ({ text: { en: '' }, type: 'OPEN', options: [], probes: {}, required: false });

function toInput(g?: Guide): SaveGuideInput {
  return {
    title: g?.title ?? '',
    description: g?.description ?? '',
    interviewType: g?.interviewType ?? 'KII',
    languages: g?.languages ?? ['en', 'ha'],
    projectId: g?.projectId ?? null,
    questions: g?.questions?.map((q) => ({ ...q, options: q.options ?? [], probes: q.probes ?? {} })) ?? [blankQuestion()],
  };
}

/**
 * Create, edit, approve and version an interview guide. A draft edits in
 * place; revising an approved guide saves as the next version (a draft),
 * and interviews already done keep the version they used.
 */
export function GuideEditor({ guide }: { guide?: Guide }) {
  const router = useRouter();
  const session = useSession();
  const save = useSaveGuide();
  const approve = useGuideAction('approve');
  const archive = useGuideAction('archive');
  const remove = useGuideAction('delete');
  const { data: projectPage } = useResearchProjects();
  const projects = projectPage?.items ?? [];
  const [form, setForm] = useState<SaveGuideInput>(() => toInput(guide));
  const [editing, setEditing] = useState(!guide || guide.status === 'DRAFT');
  const [confirm, setConfirm] = useState<'approve' | 'delete' | null>(null);
  useEffect(() => {
    setForm(toInput(guide));
    setEditing(!guide || guide.status === 'DRAFT');
  }, [guide]);

  const canEdit = session.can(guide ? 'edit.guides' : 'create.guides');
  const readOnly = !editing || !canEdit;
  const revising = !!guide && guide.status !== 'DRAFT' && editing;
  const missing = useMemo(
    () =>
      form.questions.reduce(
        (n, q) => n + form.languages.filter((l) => l !== 'en' && !q.text[l]?.trim()).length,
        0,
      ),
    [form],
  );

  const setQuestion = (i: number, q: GuideQuestion) => setForm((f) => ({ ...f, questions: f.questions.map((x, j) => (j === i ? q : x)) }));
  const move = (i: number, d: -1 | 1) =>
    setForm((f) => {
      const qs = [...f.questions];
      [qs[i], qs[i + d]] = [qs[i + d], qs[i]];
      return { ...f, questions: qs };
    });

  const submit = async () => {
    if (!form.title.trim()) return toast.error('Give the guide a title');
    if (form.questions.some((q) => !q.text.en?.trim())) return toast.error('Every question needs English text');
    const saved = await save.mutateAsync({ id: guide?.id, data: form }).catch(() => null);
    if (!saved) return;
    toast.success(revising ? `Saved as version ${saved.version} (draft)` : 'Saved');
    if (saved.id !== guide?.id) router.push(`/guides/${saved.id}`);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        eyebrow={guide ? `Interview guide · version ${guide.version}` : 'New interview guide'}
        title={guide?.title ?? 'New guide'}
        meta={guide && <StatusBadge status={guide.status} />}
        description={
          guide?.status === 'APPROVED'
            ? `Approved ${guide.approvedAt ? formatDate(guide.approvedAt) : ''}${guide.approvedBy ? ` by ${guide.approvedBy.firstName} ${guide.approvedBy.lastName}` : ''}. Field teams use this version; ${guide._count?.interviews ?? 0} interview${guide._count?.interviews === 1 ? '' : 's'} so far.`
            : guide?.status === 'DRAFT'
              ? 'Draft: field teams do not see it until it is approved.'
              : guide?.status === 'ARCHIVED'
                ? 'Archived: kept for the interviews that used it.'
                : 'Write the questions, then approve the guide to send it to field teams.'
        }
        actions={
          guide && (
            <>
              {guide.status === 'DRAFT' && session.can('approve.guides') && (
                <Button onClick={() => setConfirm('approve')} disabled={editing && save.isPending}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> Approve
                </Button>
              )}
              {guide.status !== 'DRAFT' && !editing && canEdit && (
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4" aria-hidden /> Revise
                </Button>
              )}
              {guide.status === 'APPROVED' && session.can('edit.guides') && (
                <Button variant="ghost" loading={archive.isPending} onClick={() => archive.mutate(guide.id)}>
                  <Archive className="h-4 w-4" aria-hidden /> Archive
                </Button>
              )}
              {session.can('delete.guides') && (
                <Button variant="ghost" onClick={() => setConfirm('delete')} aria-label="Delete guide">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              )}
            </>
          )
        }
      />

      {revising && (
        <p className="mb-6 rounded-lg bg-info-bg px-4 py-3 text-[14px] text-foreground">
          Saving creates version {(guide?.versions?.[0]?.version ?? guide!.version) + 1} as a draft. Version {guide!.version} stays in use until the new one is approved, and interviews keep the version they used.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-6">
          <section className="grid gap-4 rounded-xl border border-border-subtle bg-background-elevated p-5 shadow-soft sm:grid-cols-2">
            <Field id="g-title" label="Title" className="sm:col-span-2">
              <Input id="g-title" value={form.title} disabled={readOnly} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Water access key informant guide" />
            </Field>
            <Field id="g-type" label="Interview type">
              <NativeSelect id="g-type" value={form.interviewType} disabled={readOnly} onChange={(e) => setForm({ ...form, interviewType: e.target.value })}>
                {Object.entries(INTERVIEW_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l} ({v})
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="g-project" label="Project" hint="Leave as all projects to use it for every project of this type.">
              <NativeSelect
                id="g-project"
                value={form.projectId ?? ''}
                disabled={readOnly}
                onChange={(e) => setForm({ ...form, projectId: e.target.value || null })}
                aria-describedby="g-project-hint"
              >
                <option value="">All projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1.5 text-[14px] font-medium text-foreground">Languages</legend>
              <div className="flex gap-4">
                {INTERVIEW_LANGUAGES.map((l) => (
                  <label key={l.code} className="inline-flex items-center gap-2 text-[14px] text-foreground">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[hsl(var(--brand-navy))]"
                      checked={form.languages.includes(l.code)}
                      disabled={readOnly || l.code === 'en'}
                      onChange={(e) =>
                        setForm({ ...form, languages: e.target.checked ? [...form.languages, l.code] : form.languages.filter((x) => x !== l.code) })
                      }
                    />
                    {l.label}
                    {l.code === 'en' && <span className="text-foreground-tertiary">(always)</span>}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field id="g-desc" label="Notes for interviewers" optional className="sm:col-span-2">
              <Textarea id="g-desc" rows={2} value={form.description ?? ''} disabled={readOnly} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </section>

          <section aria-labelledby="questions-h">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 id="questions-h" className="type-section">
                Questions · {form.questions.length}
              </h2>
              {missing > 0 && !readOnly && <p className="text-[13px] text-warning">{missing} translation{missing === 1 ? '' : 's'} missing</p>}
            </div>
            <ol className="space-y-4">
              {form.questions.map((q, i) => (
                <QuestionCard
                  key={i}
                  index={i}
                  total={form.questions.length}
                  question={q}
                  languages={form.languages}
                  readOnly={readOnly}
                  onChange={(nq) => setQuestion(i, nq)}
                  onMove={(d) => move(i, d)}
                  onRemove={() => setForm({ ...form, questions: form.questions.filter((_, j) => j !== i) })}
                />
              ))}
            </ol>
            {!readOnly && (
              <Button variant="secondary" className="mt-4" onClick={() => setForm({ ...form, questions: [...form.questions, blankQuestion()] })}>
                <Plus className="h-4 w-4" aria-hidden /> Add question
              </Button>
            )}
          </section>

          {!readOnly && (
            <div className="sticky bottom-4 flex justify-end gap-2 rounded-xl border border-border-subtle bg-background-elevated/95 p-3 shadow-soft backdrop-blur">
              {guide && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setForm(toInput(guide));
                    setEditing(guide.status === 'DRAFT');
                  }}
                >
                  {revising ? 'Cancel revision' : 'Discard changes'}
                </Button>
              )}
              <Button onClick={submit} loading={save.isPending}>
                {revising ? 'Save as new version' : guide ? 'Save draft' : 'Create draft'}
              </Button>
            </div>
          )}
        </div>

        {guide?.versions && guide.versions.length > 0 && (
          <aside>
            <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">
              <History className="h-4 w-4" aria-hidden /> Versions
            </h2>
            <ol className="space-y-1">
              {guide.versions.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/guides/${v.id}`}
                    aria-current={v.id === guide.id ? 'page' : undefined}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-[14px] hover:bg-background-hover aria-[current=page]:bg-primary-50"
                  >
                    <span>Version {v.version}</span>
                    <StatusBadge status={v.status} size="sm" />
                  </Link>
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm === 'approve' ? `Approve version ${guide?.version}?` : 'Delete this guide?'}
        description={
          confirm === 'approve'
            ? 'Field teams will use it for new interviews of this type from their next sync. Whatever was approved for the same project and interview type (including an earlier version) is archived; interviews already done keep theirs.'
            : 'Every version moves to the Trash. Interviews that used it keep their record of the questions.'
        }
        confirmLabel={confirm === 'approve' ? 'Approve' : 'Delete'}
        variant={confirm === 'delete' ? 'danger' : 'default'}
        loading={approve.isPending || remove.isPending}
        onConfirm={async () => {
          if (!guide) return;
          if (confirm === 'approve') {
            if (editing && guide.status === 'DRAFT') await save.mutateAsync({ id: guide.id, data: form }).catch(() => null);
            await approve.mutateAsync(guide.id).catch(() => undefined);
          } else {
            const ok = await remove.mutateAsync(guide.id).then(() => true).catch(() => false);
            if (ok) router.push('/guides');
          }
          setConfirm(null);
        }}
      />
    </div>
  );
}
