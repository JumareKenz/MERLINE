'use client';

import { useMemo, useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { useRestoreFromTrash, useTrash } from '@/hooks/use-analysis-reports';
import { useSession } from '@/hooks/use-session';
import { cn, formatDateTime } from '@/lib/utils';
import type { TrashItem } from '@/types/analysis-report';

const LABEL: Record<TrashItem['type'], string> = {
  project: 'Project',
  interview: 'Interview',
  recording: 'Recording',
  participant: 'Participant',
  finding: 'Finding',
  report: 'Report',
  user: 'Member',
};

/**
 * Everything deleted in this organization, and the way back. Deleting in
 * Merline hides a record everywhere; nothing is destroyed, and consent
 * records are never deleted.
 */
export default function TrashPage() {
  const session = useSession();
  const allowed = session.can('delete.projects') && session.can('delete.interviews');
  const { data = [], isLoading, isError, error, refetch } = useTrash(allowed);
  const restore = useRestoreFromTrash();
  const [filter, setFilter] = useState<TrashItem['type'] | 'all'>('all');
  const types = useMemo(() => [...new Set(data.map((i) => i.type))], [data]);
  const visible = filter === 'all' ? data : data.filter((i) => i.type === filter);

  if (session.isResolved && !allowed) {
    return <EmptyState size="inline" icon={<Trash2 />} title="Administrators only" description="Only administrators can see and restore deleted items." />;
  }
  if (isLoading) return <LoadingState rows={5} />;
  if (isError) {
    const e = error as { message?: string; status?: number } | null;
    return <ErrorState message={e?.message ?? 'The Trash could not be loaded.'} status={e?.status} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-[14px] leading-relaxed text-foreground-secondary">
        Deleted projects, interviews, recordings, participants, findings, reports and members. Restoring a project brings back everything
        that was deleted with it. Consent records are never deleted.
      </p>

      {data.length === 0 ? (
        <EmptyState size="inline" icon={<Trash2 />} title="The Trash is empty" description="Nothing has been deleted." />
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
            {(['all', ...types] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={filter === t}
                onClick={() => setFilter(t)}
                className={cn(
                  'h-8 rounded-full border px-3 text-[13px] font-medium transition-colors',
                  filter === t ? 'border-primary bg-primary-50 text-primary-700' : 'border-border-subtle text-foreground-secondary hover:border-border-strong',
                )}
              >
                {t === 'all' ? `All · ${data.length}` : `${LABEL[t]}s · ${data.filter((i) => i.type === t).length}`}
              </button>
            ))}
          </div>
          <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-background-elevated shadow-soft">
            {visible.map((item) => (
              <li key={`${item.type}-${item.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-foreground">
                    <span className="mr-2 rounded bg-background-surface px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-foreground-tertiary">
                      {LABEL[item.type]}
                    </span>
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-foreground-tertiary">
                    {item.context ? `${item.context} · ` : ''}Deleted {formatDateTime(item.deletedAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={restore.isPending && restore.variables?.id === item.id}
                  onClick={() => restore.mutate({ type: item.type, id: item.id })}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Restore
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
