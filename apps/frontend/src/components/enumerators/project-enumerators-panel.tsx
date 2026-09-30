'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Plus, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { useAssignEnumeratorToProject, useEnumerators } from '@/hooks/use-enumerators';
import { useSession } from '@/hooks/use-session';
import { CodeBadge } from './code-badge';

/** Enumerators on one project, with a quick way to add more. Full management is on the Enumerators page. */
export function ProjectEnumeratorsPanel({ projectId }: { projectId: string }) {
  const session = useSession();
  const canView = !session.isResolved || session.can('view.enumerators');
  const canAssign = !session.isResolved || session.can('assign.enumerators');
  const onProject = useEnumerators({ projectId });
  const everyone = useEnumerators({ status: 'active' });
  const assign = useAssignEnumeratorToProject();
  const [pick, setPick] = useState('');

  if (!canView) return <EmptyState size="inline" title="Enumerators are managed by administrators" />;
  if (onProject.isLoading) return <LoadingState rows={3} message="Loading enumerators" />;
  if (onProject.isError) return <ErrorState message="The enumerators could not be loaded." onRetry={() => onProject.refetch()} />;

  const rows = onProject.data ?? [];
  const candidates = (everyone.data ?? []).filter((e) => !rows.some((r) => r.id === e.id));

  return (
    <div>
      {canAssign && (
        <form
          className="mb-4 flex flex-wrap gap-2"
          onSubmit={async (ev) => {
            ev.preventDefault();
            if (!pick) return;
            await assign.mutateAsync({ enumeratorId: pick, projectId }).catch(() => undefined);
            setPick('');
          }}
        >
          <NativeSelect aria-label="Enumerator to assign" className="min-w-[240px] flex-1 sm:flex-none" value={pick} onChange={(e) => setPick(e.target.value)} disabled={candidates.length === 0}>
            <option value="">{candidates.length === 0 ? 'Every active enumerator is assigned' : 'Assign an enumerator…'}</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
                {c.state ? ` · ${c.state}` : ''}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit" variant="secondary" disabled={!pick} loading={assign.isPending}>
            <Plus className="h-4 w-4" aria-hidden /> Assign
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/enumerators">Manage enumerators</Link>
          </Button>
        </form>
      )}
      {rows.length === 0 ? (
        <EmptyState
          size="inline"
          icon={<UsersRound />}
          title="No enumerators on this project"
          description="Assign an enumerator so they can start interviews for it in the field app."
        />
      ) : (
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-background-elevated shadow-soft">
          {rows.map((e) => (
            <li key={e.id}>
              <Link href={`/enumerators/${e.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-background-hover">
                <span>
                  <span className="text-[14px] font-medium text-foreground">{e.fullName}</span>
                  <span className="ml-2 text-[13px] text-foreground-tertiary">{e.state ?? ''}</span>
                </span>
                <span className="flex items-center gap-3 text-[13px] text-foreground-secondary">
                  {e.stats.interviews} interview{e.stats.interviews === 1 ? '' : 's'}
                  <CodeBadge state={e.accessCode.state} legacy={e.accessCode.legacyShared} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
