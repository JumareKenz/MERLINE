'use client';

import { useId, useState, type FormEvent } from 'react';
import { Check, Copy, KeyRound, MoreHorizontal, Plus, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, describedBy } from '@/components/ui/field';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { useResearchProjects } from '@/hooks/use-research-projects';
import { useSession } from '@/hooks/use-session';
import {
  useCreateFieldWorker,
  useFieldTeam,
  useIssueAccessCode,
  useRevokeAccessCode,
  useSetFieldWorkerProjects,
} from '@/hooks/use-field-team';
import { cn, formatDate } from '@/lib/utils';
import type { FieldWorker } from '@/types/field';

const FIELD_APP_URL = 'field.jrecc.org';

/** Checkbox list of active projects, with select all / none. */
function ProjectPicker({
  value,
  onChange,
  describedById,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  describedById?: string;
}) {
  const { data, isLoading } = useResearchProjects();
  const projects = (data?.items ?? []).filter((p) => p.status !== 'archived');
  const all = projects.length > 0 && projects.every((p) => value.includes(p.id));

  if (isLoading) return <LoadingState rows={2} />;
  if (projects.length === 0) {
    return <p className="text-[14px] text-foreground-secondary">No active projects yet. Create a project first.</p>;
  }

  return (
    <div aria-describedby={describedById}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] text-foreground-tertiary">
          {value.length} of {projects.length} selected
        </span>
        <button
          type="button"
          className="text-[13px] font-medium text-foreground-link hover:underline"
          onClick={() => onChange(all ? [] : projects.map((p) => p.id))}
        >
          {all ? 'Clear all' : 'Select all projects'}
        </button>
      </div>
      <ul className="max-h-64 divide-y divide-border-subtle overflow-y-auto rounded-lg border border-border-subtle">
        {projects.map((p) => {
          const checked = value.includes(p.id);
          return (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-background-hover">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(var(--brand-navy))]"
                  checked={checked}
                  onChange={() => onChange(checked ? value.filter((id) => id !== p.id) : [...value, p.id])}
                />
                <span className="text-[14px] text-foreground">{p.name}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Shows a freshly issued access code — the only time it can be read. */
function CodeReveal({ name, code, onClose }: { name: string; code: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const pretty = code.includes('-') ? code : `${code.slice(0, 5)}-${code.slice(5)}`;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Access code for {name}</DialogTitle>
          <DialogDescription>
            Share it with them privately. It is shown only now — if it is lost, issue a new one (the old one stops working).
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 flex items-center justify-between gap-3 rounded-xl bg-navy px-5 py-4">
          <code className="font-mono text-[26px] font-semibold tracking-[0.18em] text-white">{pretty}</code>
          <Button
            variant="accent"
            size="sm"
            onClick={async () => {
              await navigator.clipboard?.writeText(pretty).catch(() => undefined);
              setCopied(true);
            }}
          >
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <p className="text-[14px] text-foreground-secondary">
          They sign in at <span className="font-medium text-foreground">{FIELD_APP_URL}</span> with this code. Their assigned projects appear there
          automatically.
        </p>
        <DialogFooter className="mt-4">
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddWorkerDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (name: string, code: string) => void }) {
  const id = useId();
  const create = useCreateFieldWorker();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setProjectIds([]);
    setErrors({});
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.first = 'Enter a first name.';
    if (!lastName.trim()) next.last = 'Enter a last name.';
    if (email && !/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email, or leave it empty.';
    if (projectIds.length === 0) next.projects = 'Choose at least one project they will collect interviews for.';
    setErrors(next);
    if (Object.keys(next).length) return;
    const created = await create
      .mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        projectIds,
      })
      .catch(() => null);
    if (created) {
      onOpenChange(false);
      reset();
      onCreated(`${created.firstName} ${created.lastName}`, created.code);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a field worker</DialogTitle>
          <DialogDescription>They get an access code for the field app and can start interviews in the projects you choose.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="mt-2 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${id}-first`} label="First name" error={errors.first}>
              <Input id={`${id}-first`} value={firstName} onChange={(e) => setFirstName(e.target.value)} error={!!errors.first} aria-describedby={describedBy(`${id}-first`, { error: errors.first })} autoFocus />
            </Field>
            <Field id={`${id}-last`} label="Last name" error={errors.last}>
              <Input id={`${id}-last`} value={lastName} onChange={(e) => setLastName(e.target.value)} error={!!errors.last} aria-describedby={describedBy(`${id}-last`, { error: errors.last })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${id}-phone`} label="Phone" optional>
              <Input id={`${id}-phone`} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field id={`${id}-email`} label="Email" optional error={errors.email} hint="Not needed to sign in.">
              <Input id={`${id}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={!!errors.email} aria-describedby={describedBy(`${id}-email`, { error: errors.email, hint: true })} />
            </Field>
          </div>
          <div>
            <p className="mb-1.5 text-[14px] font-medium text-foreground">Projects</p>
            <ProjectPicker value={projectIds} onChange={setProjectIds} describedById={errors.projects ? `${id}-projects-error` : undefined} />
            {errors.projects && (
              <p id={`${id}-projects-error`} className="mt-1.5 text-[13px] text-foreground-error">
                {errors.projects}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Add and issue code
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditProjectsDialog({ worker, onClose }: { worker: FieldWorker; onClose: () => void }) {
  const setProjects = useSetFieldWorkerProjects();
  const [projectIds, setProjectIds] = useState(worker.projects.map((p) => p.id));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Projects for {worker.firstName} {worker.lastName}
          </DialogTitle>
          <DialogDescription>They can start interviews in these projects. Changes reach their phone the next time it connects.</DialogDescription>
        </DialogHeader>
        <div className="mt-3">
          <ProjectPicker value={projectIds} onChange={setProjectIds} />
        </div>
        <DialogFooter className="mt-4 gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={setProjects.isPending}
            onClick={async () => {
              const ok = await setProjects.mutateAsync({ userId: worker.id, projectIds }).then(() => true).catch(() => false);
              if (ok) onClose();
            }}
          >
            Save projects
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The field team: who collects interviews, on which projects, and whether
 * they can sign in. Admins don't set up participants or consent here —
 * field workers meet participants and record consent on site.
 */
export function FieldTeamPanel({ projectId }: { projectId?: string }) {
  const session = useSession();
  const { data, isLoading, isError, error, refetch } = useFieldTeam();
  const issue = useIssueAccessCode();
  const revoke = useRevokeAccessCode();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<FieldWorker | null>(null);
  const [reveal, setReveal] = useState<{ name: string; code: string } | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'reissue' | 'revoke'; worker: FieldWorker } | null>(null);

  const canManage = !session.isResolved || session.canAny('create.users', 'edit.users');
  const workers = (data ?? []).filter((w) => !projectId || w.projects.some((p) => p.id === projectId));

  if (isLoading) return <LoadingState message="Loading field team" />;
  if (isError) {
    const e = error as { message?: string; status?: number } | null;
    return <ErrorState message={e?.message} status={e?.status} onRetry={() => refetch()} />;
  }

  const addButton = canManage && (
    <Button onClick={() => setAdding(true)}>
      <Plus className="h-4 w-4" aria-hidden /> Add field worker
    </Button>
  );

  return (
    <div>
      {workers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background-elevated/60">
          <EmptyState
            icon={<UsersRound />}
            title={projectId ? 'Nobody is assigned to this project yet' : 'No field workers yet'}
            description="Add the people who will collect interviews. Each gets an access code for the field app, and can work on one project, several, or all of them."
            action={addButton}
          />
        </div>
      ) : (
        <>
          {!projectId && <div className="mb-4 flex justify-end">{addButton}</div>}
          <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-background-elevated shadow-soft">
            {workers.map((w) => (
              <li key={w.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-foreground">
                    {w.firstName} {w.lastName}
                    {!w.isActive && <span className="ml-2 text-[13px] font-normal text-foreground-tertiary">(deactivated)</span>}
                  </p>
                  <p className="mt-0.5 text-[13px] text-foreground-secondary">
                    {[w.phone, w.email].filter(Boolean).join(' · ') || 'No contact details'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {w.projects.length === 0 ? (
                      <span className="text-[13px] text-foreground-warning">No projects — they can&apos;t start interviews</span>
                    ) : (
                      w.projects.map((p) => (
                        <span key={p.id} className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[12px] font-medium text-primary-700">
                          {p.name}
                        </span>
                      ))
                    )}
                  </div>
                </div>
                <dl className="flex shrink-0 gap-6 text-[13px]">
                  <div>
                    <dt className="text-foreground-tertiary">Interviews</dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      {w.interviews.completed}/{w.interviews.total}
                      <span className="font-normal text-foreground-tertiary"> done</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-foreground-tertiary">Access</dt>
                    <dd className={cn('font-semibold', w.accessCodeIssuedAt ? 'text-success' : 'text-foreground-secondary')}>
                      {w.accessCodeIssuedAt ? `Code since ${formatDate(w.accessCodeIssuedAt)}` : 'No code'}
                    </dd>
                  </div>
                </dl>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${w.firstName} ${w.lastName}`}>
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onSelect={() => setEditing(w)}>Change projects</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setConfirm({ kind: 'reissue', worker: w })}>
                        <KeyRound className="mr-2 h-4 w-4" aria-hidden />
                        {w.accessCodeIssuedAt ? 'Issue a new code' : 'Issue access code'}
                      </DropdownMenuItem>
                      {w.accessCodeIssuedAt && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-error" onSelect={() => setConfirm({ kind: 'revoke', worker: w })}>
                            Revoke access
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <AddWorkerDialog open={adding} onOpenChange={setAdding} onCreated={(name, code) => setReveal({ name, code })} />
      {editing && <EditProjectsDialog worker={editing} onClose={() => setEditing(null)} />}
      {reveal && <CodeReveal name={reveal.name} code={reveal.code} onClose={() => setReveal(null)} />}
      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={confirm.kind === 'revoke' ? `Revoke access for ${confirm.worker.firstName}?` : `Issue a new code for ${confirm.worker.firstName}?`}
          description={
            confirm.kind === 'revoke'
              ? 'Their code stops working immediately. Recordings already on their phone stay there until they sign in again with a new code.'
              : 'Any previous code stops working. You will see the new code once.'
          }
          confirmLabel={confirm.kind === 'revoke' ? 'Revoke access' : 'Issue new code'}
          variant={confirm.kind === 'revoke' ? 'danger' : 'default'}
          loading={issue.isPending || revoke.isPending}
          onConfirm={async () => {
            const w = confirm.worker;
            if (confirm.kind === 'revoke') {
              await revoke.mutateAsync(w.id).catch(() => undefined);
            } else {
              const res = await issue.mutateAsync(w.id).catch(() => null);
              if (res) setReveal({ name: `${w.firstName} ${w.lastName}`, code: res.code });
            }
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}
