'use client';

import { useId, useState, type FormEvent } from 'react';
import { Check, Copy, Eye, KeyRound, MoreHorizontal, Plus, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
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
  fetchAccessCode,
  useCreateAccessCode,
  useFieldTeam,
  useIssueAccessCode,
  useRenameAccessCode,
  useRevokeAccessCode,
  useSetFieldWorkerProjects,
} from '@/hooks/use-field-team';
import { describeError } from '@/lib/errors';
import { formatDate } from '@/lib/utils';
import type { FieldWorker } from '@/types/field';

const FIELD_APP_URL = 'field.jrecc.org';

/** Older codes were 10 characters; show them as XXXXX-XXXXX. */
function prettyCode(code: string) {
  return code.length === 10 && !code.includes('-') ? `${code.slice(0, 5)}-${code.slice(5)}` : code;
}

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

/** A code, large enough to read out to a team. */
function CodeReveal({ name, code, fresh, onClose }: { name: string; code: string; fresh?: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const pretty = prettyCode(code);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{fresh ? `Access code for ${name}` : name}</DialogTitle>
          <DialogDescription>
            Share it with the enumerators who will use it. Everyone can use the same code; each interview asks who is conducting it.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 flex items-center justify-between gap-3 rounded-xl bg-navy px-5 py-4">
          <code className="font-mono text-[34px] font-semibold tracking-[0.3em] text-white">{pretty}</code>
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
          They sign in at <span className="font-medium text-foreground">{FIELD_APP_URL}</span> with this code. The projects it opens appear there
          automatically.
        </p>
        <DialogFooter className="mt-4">
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateCodeDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (name: string, code: string) => void }) {
  const id = useId();
  const create = useCreateAccessCode();
  const [name, setName] = useState('');
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setName('');
    setProjectIds([]);
    setErrors({});
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Give the code a name, such as a team or place.';
    if (projectIds.length === 0) next.projects = 'Choose at least one project this code opens.';
    setErrors(next);
    if (Object.keys(next).length) return;
    const created = await create.mutateAsync({ name: name.trim(), projectIds }).catch(() => null);
    if (created) {
      onOpenChange(false);
      reset();
      onCreated(created.name, created.code);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New access code</DialogTitle>
          <DialogDescription>
            A 4-character code for the field app that opens the projects you choose. Any number of enumerators can use it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="mt-2 space-y-4">
          <Field id={`${id}-name`} label="Name" error={errors.name} hint="For you: a team, a place, or a person, e.g. “Kano team A”.">
            <Input
              id={`${id}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!errors.name}
              aria-describedby={describedBy(`${id}-name`, { error: errors.name, hint: true })}
              maxLength={100}
              autoFocus
            />
          </Field>
          <div>
            <p className="mb-1.5 text-[14px] font-medium text-foreground">Projects it opens</p>
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
              Create code
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
          <DialogTitle>Projects for {worker.name}</DialogTitle>
          <DialogDescription>Interviews can be started in these projects with this code. Changes reach phones the next time they connect.</DialogDescription>
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
              const ok = await setProjects
                .mutateAsync({ userId: worker.id, projectIds })
                .then(() => true)
                .catch(() => false);
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

function RenameDialog({ worker, onClose }: { worker: FieldWorker; onClose: () => void }) {
  const rename = useRenameAccessCode();
  const [name, setName] = useState(worker.name);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rename code</DialogTitle>
          <DialogDescription>The code itself does not change.</DialogDescription>
        </DialogHeader>
        <form
          className="mt-2 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            const ok = await rename
              .mutateAsync({ userId: worker.id, name: name.trim() })
              .then(() => true)
              .catch(() => false);
            if (ok) onClose();
          }}
        >
          <Input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={rename.isPending} disabled={!name.trim()}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Access codes for the field app: each opens one or more projects, and any
 * number of enumerators can share it. Who conducted each interview is asked
 * on the phone at the start of every interview.
 */
export function FieldTeamPanel({ projectId }: { projectId?: string }) {
  const session = useSession();
  const { data, isLoading, isError, error, refetch } = useFieldTeam();
  const issue = useIssueAccessCode();
  const revoke = useRevokeAccessCode();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<FieldWorker | null>(null);
  const [renaming, setRenaming] = useState<FieldWorker | null>(null);
  const [reveal, setReveal] = useState<{ name: string; code: string; fresh?: boolean } | null>(null);
  const [showing, setShowing] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'reissue' | 'revoke'; worker: FieldWorker } | null>(null);

  const canManage = !session.isResolved || session.canAny('create.users', 'edit.users');
  const canReadCodes = !session.isResolved || session.can('edit.users');
  const codes = (data ?? []).filter((w) => !projectId || w.projects.some((p) => p.id === projectId));

  const showCode = async (w: FieldWorker) => {
    setShowing(w.id);
    try {
      const code = await fetchAccessCode(w.id);
      if (code) setReveal({ name: w.name, code });
      else toast.error('This code was revoked. Issue a new one to use it again.');
    } catch (err) {
      toast.error(describeError(err, 'The code could not be shown'));
    } finally {
      setShowing(null);
    }
  };

  if (isLoading) return <LoadingState message="Loading access codes" />;
  if (isError) {
    const e = error as { message?: string; status?: number } | null;
    return <ErrorState message={e?.message} status={e?.status} onRetry={() => refetch()} />;
  }

  const addButton = canManage && (
    <Button onClick={() => setAdding(true)}>
      <Plus className="h-4 w-4" aria-hidden /> New access code
    </Button>
  );

  return (
    <div>
      {codes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background-elevated/60">
          <EmptyState
            icon={<UsersRound />}
            title={projectId ? 'No access code opens this project yet' : 'No access codes yet'}
            description="Create a code for the projects your enumerators work on and share it with them. Any number of people can use the same code; each interview records who conducted it."
            action={addButton}
          />
        </div>
      ) : (
        <>
          {!projectId && <div className="mb-4 flex justify-end">{addButton}</div>}
          <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-background-elevated shadow-soft">
            {codes.map((w) => (
              <li key={w.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-foreground">
                    {w.name}
                    {!w.isActive && <span className="ml-2 text-[13px] font-normal text-foreground-tertiary">(deactivated)</span>}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {w.projects.length === 0 ? (
                      <span className="text-[13px] text-foreground-warning">No projects: interviews can&apos;t be started with this code</span>
                    ) : (
                      w.projects.map((p) => (
                        <span key={p.id} className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[12px] font-medium text-primary-700">
                          {p.name}
                        </span>
                      ))
                    )}
                  </div>
                  <p className="mt-2 text-[13px] text-foreground-secondary">
                    {w.enumerators.length === 0 ? (
                      <span className="text-foreground-tertiary">No interviews with a named interviewer yet</span>
                    ) : (
                      <>
                        Used by{' '}
                        {w.enumerators
                          .slice(0, 6)
                          .map((e) => `${e.name} (${e.interviews})`)
                          .join(', ')}
                        {w.enumerators.length > 6 && ` and ${w.enumerators.length - 6} more`}
                      </>
                    )}
                  </p>
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
                    <dt className="text-foreground-tertiary">Code</dt>
                    <dd>
                      {w.accessCodeIssuedAt ? (
                        canReadCodes ? (
                          <Button variant="secondary" size="xs" loading={showing === w.id} onClick={() => void showCode(w)}>
                            <Eye className="h-3.5 w-3.5" aria-hidden /> Show code
                          </Button>
                        ) : (
                          <span className="font-semibold text-success">Since {formatDate(w.accessCodeIssuedAt)}</span>
                        )
                      ) : (
                        <span className="font-semibold text-foreground-secondary">Revoked</span>
                      )}
                    </dd>
                  </div>
                </dl>
                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${w.name}`}>
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60">
                      <DropdownMenuItem onSelect={() => setEditing(w)}>Change projects</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setRenaming(w)}>Rename</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setConfirm({ kind: 'reissue', worker: w })}>
                        <KeyRound className="mr-2 h-4 w-4" aria-hidden />
                        {w.accessCodeIssuedAt ? 'Replace with a new code' : 'Issue a code'}
                      </DropdownMenuItem>
                      {w.accessCodeIssuedAt && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-error" onSelect={() => setConfirm({ kind: 'revoke', worker: w })}>
                            Revoke code
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

      <CreateCodeDialog open={adding} onOpenChange={setAdding} onCreated={(name, code) => setReveal({ name, code, fresh: true })} />
      {editing && <EditProjectsDialog worker={editing} onClose={() => setEditing(null)} />}
      {renaming && <RenameDialog worker={renaming} onClose={() => setRenaming(null)} />}
      {reveal && <CodeReveal name={reveal.name} code={reveal.code} fresh={reveal.fresh} onClose={() => setReveal(null)} />}
      {confirm && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title={confirm.kind === 'revoke' ? `Revoke the code for ${confirm.worker.name}?` : `Replace the code for ${confirm.worker.name}?`}
          description={
            confirm.kind === 'revoke'
              ? 'The code stops working and every phone using it is signed out. Recordings already on those phones stay there until someone signs in again with a new code.'
              : 'The current code stops working and every phone using it is signed out. Give the enumerators the new code. Recordings on their phones are kept and upload after they sign in again.'
          }
          confirmLabel={confirm.kind === 'revoke' ? 'Revoke code' : 'Replace code'}
          variant={confirm.kind === 'revoke' ? 'danger' : 'default'}
          loading={issue.isPending || revoke.isPending}
          onConfirm={async () => {
            const w = confirm.worker;
            if (confirm.kind === 'revoke') {
              await revoke.mutateAsync(w.id).catch(() => undefined);
            } else {
              const res = await issue.mutateAsync(w.id).catch(() => null);
              if (res) setReveal({ name: w.name, code: res.code, fresh: true });
            }
            setConfirm(null);
          }}
        />
      )}
    </div>
  );
}
