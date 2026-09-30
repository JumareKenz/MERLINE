'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, KeyRound, Pencil, Plus, Power, RefreshCw, ShieldOff, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { CodeBadge } from '@/components/enumerators/code-badge';
import { CodeRevealDialog } from '@/components/enumerators/code-reveal-dialog';
import { EditEnumeratorDialog } from '@/components/enumerators/enumerator-form-dialog';
import { ReviewStatusBadge } from '@/components/transcripts/review-status-badge';
import {
  useAssignProject,
  useEnumerator,
  useEnumeratorSubmissions,
  useIssueCode,
  useRemoveProject,
  useRevokeCode,
  useSetEnumeratorActive,
} from '@/hooks/use-enumerators';
import { useResearchProjects } from '@/hooks/use-research-projects';
import { useSession } from '@/hooks/use-session';
import { typeLabel } from '@/lib/interview-types';
import { formatDate } from '@/lib/utils';
import type { ReviewStatus } from '@/types/review';
import type { IssuedAccessCode } from '@/types/enumerator';

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-background-elevated px-4 py-3">
      <dt className="text-[12px] font-medium text-foreground-tertiary">{label}</dt>
      <dd className="mt-1 font-display text-[26px] font-semibold leading-none tabular-nums text-foreground">{value}</dd>
      {hint && <p className="mt-1 text-[12px] text-foreground-tertiary">{hint}</p>}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] font-medium text-foreground-tertiary">{label}</dt>
      <dd className="mt-0.5 text-[14px] text-foreground">{children || '—'}</dd>
    </div>
  );
}

export default function EnumeratorPage() {
  const { enumeratorId } = useParams<{ enumeratorId: string }>();
  const session = useSession();
  const canEdit = !session.isResolved || session.can('edit.enumerators');
  const canAssign = !session.isResolved || session.can('assign.enumerators');
  const canCodes = !session.isResolved || session.can('manage.access-codes');
  const canSeeSubmissions = !session.isResolved || session.can('view.recordings');

  const query = useEnumerator(enumeratorId);
  const [typeFilter, setTypeFilter] = useState('');
  const submissions = useEnumeratorSubmissions(enumeratorId, typeFilter ? { type: typeFilter } : undefined);
  const allProjects = useResearchProjects();
  const setActive = useSetEnumeratorActive(enumeratorId);
  const assign = useAssignProject(enumeratorId);
  const remove = useRemoveProject(enumeratorId);
  const issue = useIssueCode(enumeratorId);
  const revoke = useRevokeCode(enumeratorId);

  const [edit, setEdit] = useState(false);
  const [confirmActive, setConfirmActive] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reveal, setReveal] = useState<IssuedAccessCode | null>(null);
  const [toAssign, setToAssign] = useState('');

  const e = query.data;
  const assignable = useMemo(
    () => (allProjects.data?.items ?? []).filter((p) => p.status !== 'archived' && !(e?.projects ?? []).some((a) => a.id === p.id)),
    [allProjects.data, e?.projects],
  );
  const typesSeen = useMemo(() => [...new Set((submissions.data ?? []).map((s) => s.type).filter((t): t is string => !!t))], [submissions.data]);

  if (query.isLoading) return <LoadingState message="Loading enumerator" rows={6} />;
  if (query.isError || !e) {
    return <ErrorState status={(query.error as { status?: number } | null)?.status} message="This enumerator could not be loaded." onRetry={() => query.refetch()} />;
  }

  const code = e.accessCode;
  const hasCode = code.state !== 'NONE';

  return (
    <div>
      <Link href="/enumerators" className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground-secondary hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All enumerators
      </Link>
      <PageHeader
        title={e.fullName}
        eyebrow={e.uniqueId ?? undefined}
        meta={<Badge variant={e.isActive ? 'success' : 'default'}>{e.isActive ? 'Active' : 'Inactive'}</Badge>}
        actions={
          <>
            {canEdit && (
              <Button variant="secondary" onClick={() => setEdit(true)}>
                <Pencil className="h-4 w-4" aria-hidden /> Edit
              </Button>
            )}
            {canEdit && (
              <Button variant="secondary" onClick={() => (e.isActive ? setConfirmActive(true) : setActive.mutate(true))} loading={setActive.isPending && !e.isActive}>
                <Power className="h-4 w-4" aria-hidden /> {e.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="profile-h" className="rounded-xl border border-border-subtle bg-background-elevated p-5 lg:col-span-1">
          <h2 id="profile-h" className="mb-4 text-[15px] font-semibold text-foreground">
            Profile
          </h2>
          <dl className="grid gap-3.5">
            <Detail label="Phone">{e.phone}</Detail>
            <Detail label="Email">{e.email}</Detail>
            <Detail label="State">{e.state}</Detail>
            <Detail label="Added">{formatDate(e.createdAt)}</Detail>
            <Detail label="Last activity">{e.lastActivityAt ? formatDate(e.lastActivityAt) : 'No activity yet'}</Detail>
            {e.notes && <Detail label="Notes">{e.notes}</Detail>}
          </dl>
        </section>

        <section aria-labelledby="code-h" className="rounded-xl border border-border-subtle bg-background-elevated p-5 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="code-h" className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <KeyRound className="h-4 w-4 text-primary" aria-hidden /> Field-app access code
            </h2>
            <CodeBadge state={code.state} legacy={code.legacyShared} />
          </div>
          {code.legacyShared && (
            <p className="mb-3 rounded-lg bg-warning-bg px-3 py-2.5 text-[13.5px] text-foreground" role="note">
              This account still uses an older short code that several people may share, so interviews cannot be tied to one person. Issue a personal
              code to replace it; the old one stops working immediately.
            </p>
          )}
          <dl className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Issued">{code.issuedAt ? formatDate(code.issuedAt) : null}</Detail>
            <Detail label="Expires">{code.state === 'NONE' ? null : code.expiresAt ? formatDate(code.expiresAt) : 'Never'}</Detail>
            <Detail label="Last used">{code.lastUsedAt ? formatDate(code.lastUsedAt) : 'Not used yet'}</Detail>
            <Detail label="Revoked">{code.revokedAt ? formatDate(code.revokedAt) : null}</Detail>
          </dl>
          <p className="mt-3 text-[13px] text-foreground-tertiary">The code itself is never shown again after it is issued; it is stored as a one-way hash.</p>
          {canCodes && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => (hasCode ? setConfirmIssue(true) : issue.mutateAsync(undefined).then(setReveal).catch(() => undefined))} loading={issue.isPending && !hasCode}>
                <RefreshCw className="h-4 w-4" aria-hidden /> {hasCode ? 'Regenerate code' : 'Issue a code'}
              </Button>
              {(code.state === 'ACTIVE' || code.state === 'UNUSED' || code.legacyShared) && (
                <Button variant="secondary" onClick={() => setRevokeOpen(true)}>
                  <ShieldOff className="h-4 w-4" aria-hidden /> Revoke
                </Button>
              )}
            </div>
          )}
        </section>
      </div>

      <section aria-labelledby="summary-h" className="mt-8">
        <h2 id="summary-h" className="mb-3 text-[16px] font-semibold text-foreground">
          Work
        </h2>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Interviews" value={e.summary.interviews} />
          <Stat label="Recordings submitted" value={e.summary.recordingsSubmitted} />
          <Stat label="Pending submissions" value={e.summary.pendingSubmissions} hint="Started, no recording yet" />
          <Stat label="Reports using their work" value={e.summary.reports} />
          <Stat label="Transcripts to review" value={e.summary.transcriptsAwaitingEnumerator} hint="Waiting for them" />
          <Stat label="Awaiting admin" value={e.summary.transcriptsAwaitingAdmin} hint="They have submitted" />
          <Stat label="Transcripts approved" value={e.summary.transcriptsApproved} />
        </dl>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="projects-h" className="rounded-xl border border-border-subtle bg-background-elevated p-5">
          <h2 id="projects-h" className="mb-3 text-[15px] font-semibold text-foreground">
            Assigned projects
          </h2>
          {e.projects.length === 0 ? (
            <p className="text-[14px] text-foreground-secondary">Not assigned to any project. They cannot start interviews until you assign one.</p>
          ) : (
            <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle">
              {e.projects.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/projects/${p.id}`} className="truncate text-[14px] font-medium text-foreground-link hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-[12px] text-foreground-tertiary">
                      {p.interviews ?? 0} interview{p.interviews === 1 ? '' : 's'} · {p.status}
                    </p>
                  </div>
                  {canAssign && (
                    <Button variant="ghost" size="sm" aria-label={`Remove ${p.name}`} onClick={() => remove.mutate(p.id)} disabled={remove.isPending}>
                      <X className="h-4 w-4" aria-hidden /> Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canAssign && (
            <form
              className="mt-4 flex gap-2"
              onSubmit={async (ev) => {
                ev.preventDefault();
                if (!toAssign) return;
                await assign.mutateAsync(toAssign).catch(() => undefined);
                setToAssign('');
              }}
            >
              <NativeSelect aria-label="Project to assign" value={toAssign} onChange={(ev) => setToAssign(ev.target.value)} disabled={assignable.length === 0}>
                <option value="">{assignable.length === 0 ? 'Every project is assigned' : 'Choose a project…'}</option>
                {assignable.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
              <Button type="submit" variant="secondary" disabled={!toAssign} loading={assign.isPending}>
                <Plus className="h-4 w-4" aria-hidden /> Assign
              </Button>
            </form>
          )}
          {e.completedProjects.length > 0 && (
            <div className="mt-4">
              <p className="text-[12px] font-medium text-foreground-tertiary">Completed projects</p>
              <ul className="mt-1 text-[14px] text-foreground-secondary">
                {e.completedProjects.map((p) => (
                  <li key={p.id}>{p.name}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section aria-labelledby="activity-h" className="rounded-xl border border-border-subtle bg-background-elevated p-5">
          <h2 id="activity-h" className="mb-3 text-[15px] font-semibold text-foreground">
            Recent activity
          </h2>
          {e.recentActivity.length === 0 ? (
            <p className="text-[14px] text-foreground-secondary">Nothing yet. Activity appears here once they sign in and start interviews.</p>
          ) : (
            <ol className="space-y-3">
              {e.recentActivity.map((a, i) => (
                <li key={i} className="flex gap-3 text-[14px]">
                  <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-lemon-500" />
                  <div className="min-w-0">
                    <p className="text-foreground">{a.kind === 'interview' ? a.label : accountEventLabel(a.label)}</p>
                    <p className="text-[12px] text-foreground-tertiary">
                      {formatDate(a.at)}
                      {a.detail ? ` · ${a.detail}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {canSeeSubmissions && (
        <section aria-labelledby="subs-h" className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="subs-h" className="text-[16px] font-semibold text-foreground">
              Recordings and transcripts
            </h2>
            {typesSeen.length > 1 || typeFilter ? (
              <NativeSelect aria-label="Interview type" className="w-52" value={typeFilter} onChange={(ev) => setTypeFilter(ev.target.value)}>
                <option value="">All interview types</option>
                {[...new Set([...typesSeen, ...(typeFilter ? [typeFilter] : [])])].map((t) => (
                  <option key={t} value={t}>
                    {typeLabel(t)}
                  </option>
                ))}
              </NativeSelect>
            ) : null}
          </div>
          {submissions.isLoading ? (
            <LoadingState rows={3} />
          ) : submissions.isError ? (
            <ErrorState message="Their submissions could not be loaded." onRetry={() => submissions.refetch()} />
          ) : (submissions.data ?? []).length === 0 ? (
            <EmptyState size="inline" title="No submissions" description="Interviews and recordings they submit from the field app are listed here." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border-subtle bg-background-elevated">
              <table className="w-full min-w-[720px] text-left text-[14px]">
                <thead>
                  <tr className="bg-background-surface text-[12px] uppercase tracking-[0.06em] text-foreground-tertiary">
                    {['Interview', 'Type', 'Project', 'Date', 'Recordings', 'Transcript'].map((h) => (
                      <th key={h} scope="col" className="px-4 py-2.5 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(submissions.data ?? []).map((s) => (
                    <tr key={s.id} className="border-t border-border-subtle">
                      <td className="px-4 py-2.5">
                        <Link href={`/interviews/${s.id}`} className="font-medium text-foreground-link hover:underline">
                          {s.participant.displayName}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">{typeLabel(s.type)}</td>
                      <td className="px-4 py-2.5">{s.project?.name ?? '—'}</td>
                      <td className="px-4 py-2.5 text-foreground-secondary">{formatDate(s.createdAt)}</td>
                      <td className="px-4 py-2.5 tabular-nums">{s.recordings.length}</td>
                      <td className="px-4 py-2.5">
                        {s.transcripts.length === 0 ? (
                          <span className="text-foreground-tertiary">None</span>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            {s.transcripts.map((t) => (
                              <Link key={t.id} href={`/transcripts/${t.id}`} className="hover:opacity-80">
                                <ReviewStatusBadge status={t.reviewStatus as ReviewStatus} size="sm" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {edit && <EditEnumeratorDialog enumerator={e} onClose={() => setEdit(false)} />}

      <ConfirmDialog
        open={confirmActive}
        onOpenChange={setConfirmActive}
        title={`Deactivate ${e.fullName}?`}
        description="They are signed out of the field app now and cannot sign in until you activate the account again. Their interviews and transcripts are kept."
        confirmLabel="Deactivate"
        variant="danger"
        loading={setActive.isPending}
        onConfirm={async () => {
          await setActive.mutateAsync(false).catch(() => undefined);
          setConfirmActive(false);
        }}
      />

      <ConfirmDialog
        open={confirmIssue}
        onOpenChange={setConfirmIssue}
        title="Regenerate the access code?"
        description={`The current code stops working immediately and any phone signed in with it is signed out. ${e.fullName} will need the new code, which is shown once.`}
        confirmLabel="Regenerate code"
        variant="danger"
        loading={issue.isPending}
        onConfirm={async () => {
          const issued = await issue.mutateAsync(undefined).catch(() => null);
          setConfirmIssue(false);
          if (issued) setReveal(issued);
        }}
      />

      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke the access code?</DialogTitle>
            <DialogDescription>
              It stops working immediately and phones using it are signed out. You can issue a new code later.
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="revoke-reason" className="mt-2 block text-[14px] font-medium text-foreground">
            Reason <span className="font-normal text-foreground-tertiary">(optional, kept in the audit log)</span>
          </label>
          <Textarea id="revoke-reason" value={reason} onChange={(ev) => setReason(ev.target.value)} rows={2} maxLength={300} placeholder="e.g. Phone lost" />
          <DialogFooter className="mt-4 gap-2">
            <Button variant="ghost" onClick={() => setRevokeOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={revoke.isPending}
              onClick={async () => {
                await revoke.mutateAsync(reason.trim() || undefined).catch(() => undefined);
                setRevokeOpen(false);
                setReason('');
              }}
            >
              Revoke code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {reveal && <CodeRevealDialog name={e.fullName} code={reveal.code} expiresAt={reveal.expiresAt} uniqueId={e.uniqueId ?? undefined} onClose={() => setReveal(null)} />}
    </div>
  );
}

const EVENT_LABELS: Record<string, string> = {
  'enumerator.created': 'Account created',
  'enumerator.updated': 'Details updated',
  'enumerator.activated': 'Account activated',
  'enumerator.deactivated': 'Account deactivated',
  'enumerator.projects_set': 'Projects updated',
  'enumerator.project_assigned': 'Project assigned',
  'enumerator.project_removed': 'Project removed',
  'enumerator.access_code_issued': 'Access code issued',
  'enumerator.access_code_regenerated': 'Access code regenerated',
  'enumerator.access_code_revoked': 'Access code revoked',
  'field_login.succeeded': 'Signed in to the field app',
};

function accountEventLabel(event: string): string {
  return EVENT_LABELS[event] ?? event.replace(/[._]/g, ' ');
}
