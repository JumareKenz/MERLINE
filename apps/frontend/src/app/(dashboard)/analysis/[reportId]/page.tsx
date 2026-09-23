'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, RotateCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ErrorState } from '@/components/shared/error-state';
import { LoadingState } from '@/components/shared/loading-state';
import { ExportButtons } from '@/components/analysis/export-buttons';
import { ReportView } from '@/components/analysis/report-view';
import { useAnalysisReport, useDeleteReport, useRequestReport } from '@/hooks/use-analysis-reports';
import { useSession } from '@/hooks/use-session';
import { formatDateTime } from '@/lib/utils';

const KIND = { INTERVIEW: 'Interview report', PROJECT: 'Project report', CUSTOM: 'Research brief' } as const;

export default function ReportPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const router = useRouter();
  const session = useSession();
  const { data: report, isLoading, isError, error, refetch } = useAnalysisReport(reportId);
  const regenerate = useRequestReport();
  const remove = useDeleteReport();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) return <LoadingState message="Loading report" rows={8} />;
  if (isError || !report) {
    const e = error as { message?: string; status?: number } | null;
    return <ErrorState message={e?.message ?? 'This report could not be found.'} status={e?.status ?? 404} onRetry={() => refetch()} />;
  }

  const doc = report.content;
  const back = report.projectId ? `/projects/${report.projectId}` : report.interviewId ? `/interviews/${report.interviewId}` : '/projects';
  const busy = report.status === 'PENDING' || report.status === 'PROCESSING';

  return (
    <div className="mx-auto max-w-[1180px]">
      <Link href={back} className="mb-4 inline-flex items-center gap-1.5 text-[14px] text-foreground-secondary hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {report.project?.name ?? 'Back'}
      </Link>

      <header className="relative mb-10 overflow-hidden rounded-2xl bg-navy px-6 py-8 text-white shadow-soft sm:px-10 sm:py-10">
        <div aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rotate-12 rounded-[48px] bg-white/[0.04]" />
        <span className="inline-block rounded bg-lemon-500 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-lemon-foreground">
          {doc?.kind ?? KIND[report.scope]}
        </span>
        <h1 className="mt-4 max-w-3xl font-display text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">{doc?.title ?? report.title}</h1>
        {doc?.subtitle && <p className="mt-2 text-[16px] text-white/75">{doc.subtitle}</p>}
        {report.instructions && <p className="mt-3 max-w-3xl text-[14px] text-white/70">Asked for: “{report.instructions}”</p>}
        {doc && (
          <dl className="mt-8 grid gap-x-8 gap-y-4 border-t border-white/15 pt-5 sm:grid-cols-3">
            {doc.meta
              .filter((m) => m.label !== 'Requested')
              .slice(0, 6)
              .map((m) => (
                <div key={m.label}>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">{m.label}</dt>
                  <dd className="mt-0.5 text-[14px]">{m.value}</dd>
                </div>
              ))}
          </dl>
        )}
      </header>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-foreground-tertiary">
          {report.completedAt ? `Generated ${formatDateTime(report.completedAt)}` : `Requested ${formatDateTime(report.createdAt)}`}
          {report.requestedBy ? ` by ${report.requestedBy.firstName} ${report.requestedBy.lastName}` : ''}
          {report.sourceCount > 1 ? ` · from ${report.sourceCount} interviews` : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {report.status === 'COMPLETED' && session.can('export.reports') && <ExportButtons reportId={report.id} name={doc?.title} />}
          {report.scope !== 'CUSTOM' && !busy && session.can('create.reports') && (
            <Button
              variant="ghost"
              loading={regenerate.isPending}
              onClick={async () => {
                const next = await regenerate
                  .mutateAsync(
                    report.scope === 'INTERVIEW'
                      ? { scope: 'INTERVIEW', interviewId: report.interviewId!, language: report.language }
                      : { scope: 'PROJECT', projectId: report.projectId!, language: report.language },
                  )
                  .catch(() => null);
                if (next) router.push(`/analysis/${next.id}`);
              }}
            >
              <RotateCw className="h-4 w-4" aria-hidden /> Regenerate
            </Button>
          )}
          {session.can('delete.reports') && (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)} aria-label="Delete report">
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>

      {busy && (
        <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-background-elevated px-5 py-6 shadow-soft" role="status" aria-live="polite">
          <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-primary" aria-hidden />
          <div>
            <p className="text-[15px] font-semibold text-foreground">Writing the report…</p>
            <p className="mt-1 text-[14px] text-foreground-secondary">
              {report.scope === 'INTERVIEW'
                ? 'Reading the whole transcript. This usually takes under a minute.'
                : 'Each interview is analysed first (reusing reports that are already up to date), then brought together. Large projects can take a few minutes; this page updates by itself.'}
            </p>
            {report.errorMessage && <p className="mt-2 text-[13px] text-foreground-secondary">{report.errorMessage}</p>}
          </div>
        </div>
      )}
      {report.status === 'FAILED' && (
        <p className="rounded-xl bg-error-bg px-5 py-4 text-[14px] text-foreground" role="alert">
          The report could not be written: {report.errorMessage}
        </p>
      )}
      {doc && report.status === 'COMPLETED' && <ReportView doc={doc} />}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this report?"
        description="It moves to the Trash, where an administrator can restore it. Interviews and transcripts are not affected."
        confirmLabel="Delete report"
        variant="danger"
        loading={remove.isPending}
        onConfirm={async () => {
          await remove.mutateAsync(report.id).catch(() => undefined);
          setConfirmDelete(false);
          router.push(back);
        }}
      />
    </div>
  );
}
