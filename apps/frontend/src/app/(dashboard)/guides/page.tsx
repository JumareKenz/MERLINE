'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, FileSpreadsheet, ListChecks, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { UploadGuideDialog } from '@/components/guides/upload-guide-dialog';
import { downloadGuideTemplate, useGuides } from '@/hooks/use-guides';
import { useSession } from '@/hooks/use-session';
import { languageLabel } from '@/lib/languages';
import { cn, formatDate } from '@/lib/utils';
import type { Guide } from '@/types/guide';
import { INTERVIEW_TYPE_LABELS } from '@/types/research-project';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** One row per guide: its approved version (what field teams use) and any newer draft. */
function families(list: Guide[]) {
  const by = new Map<string, Guide[]>();
  for (const g of list) by.set(g.familyId, [...(by.get(g.familyId) ?? []), g]);
  return [...by.values()]
    .map((versions) => {
      versions.sort((a, b) => b.version - a.version);
      const approved = versions.find((v) => v.status === 'APPROVED');
      const draft = versions.find((v) => v.status === 'DRAFT');
      return { latest: versions[0], approved, draft, count: versions.length };
    })
    .sort((a, b) => b.latest.updatedAt.localeCompare(a.latest.updatedAt));
}

export default function GuidesPage() {
  const session = useSession();
  const { data = [], isLoading, isError, error, refetch } = useGuides();
  const [type, setType] = useState<string>('all');
  const [uploading, setUploading] = useState(false);
  const rows = useMemo(() => families(data).filter((f) => type === 'all' || f.latest.interviewType === type), [data, type]);
  const types = useMemo(() => [...new Set(data.map((g) => g.interviewType))], [data]);
  const canCreate = session.can('create.guides');

  return (
    <div>
      <PageHeader
        title="Interview guides"
        description="The approved questions field teams ask, by interview type, in English and Hausa. Revising an approved guide creates a new version; past interviews keep theirs."
        actions={
          canCreate && (
            <>
              <Button variant="ghost" onClick={() => downloadGuideTemplate('xlsx')}>
                <FileSpreadsheet className="h-4 w-4" aria-hidden /> Template
              </Button>
              <Button variant="secondary" onClick={() => setUploading(true)}>
                <Upload className="h-4 w-4" aria-hidden /> Upload
              </Button>
              <Button asChild>
                <Link href="/guides/new">
                  <Plus className="h-4 w-4" aria-hidden /> New guide
                </Link>
              </Button>
            </>
          )
        }
      />

      {types.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by interview type">
          {['all', ...types].map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={type === t}
              onClick={() => setType(t)}
              className={cn(
                'h-8 rounded-full border px-3 text-[13px] font-medium transition-colors',
                type === t ? 'border-primary bg-primary-50 text-primary-700' : 'border-border-subtle text-foreground-secondary hover:border-border-strong',
              )}
            >
              {t === 'all' ? 'All types' : INTERVIEW_TYPE_LABELS[t] ?? t}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <LoadingState rows={4} />
      ) : isError ? (
        <ErrorState message={(error as { message?: string })?.message ?? 'Guides could not be loaded.'} onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ListChecks />}
          title="No interview guides yet"
          description="Write one here, or upload a spreadsheet using the template. Approved guides appear on field workers' phones for interviews of that type."
          action={
            canCreate && (
              <Button asChild>
                <Link href="/guides/new">
                  <Plus className="h-4 w-4" aria-hidden /> New guide
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-background-elevated shadow-soft">
          {rows.map(({ latest, approved, draft, count }) => {
            const shown = approved ?? latest;
            return (
              <li key={latest.familyId}>
                <Link href={`/guides/${(draft ?? shown).id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-background-hover">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] font-semibold text-foreground">{latest.title}</span>
                      <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[11.5px] font-semibold text-primary-700">{latest.interviewType}</span>
                    </p>
                    <p className="mt-0.5 text-[13px] text-foreground-tertiary">
                      {[
                        latest.project?.name ?? 'All projects',
                        latest.languages.map((l) => languageLabel(l)).join(' + '),
                        plural(shown._count?.questions ?? 0, 'question'),
                        plural(shown._count?.interviews ?? 0, 'interview'),
                        `updated ${formatDate(latest.updatedAt)}`,
                      ].join(' · ')}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    {approved && <StatusBadge status="APPROVED" label={`v${approved.version} approved`} size="sm" />}
                    {draft && <StatusBadge status="DRAFT" label={`v${draft.version} draft`} size="sm" />}
                    {!approved && !draft && <StatusBadge status={latest.status} size="sm" />}
                    {count > 1 && <span className="text-[12px] text-foreground-tertiary">{count} versions</span>}
                    <ChevronRight className="h-4 w-4 text-foreground-tertiary" aria-hidden />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <UploadGuideDialog open={uploading} onOpenChange={setUploading} />
    </div>
  );
}
