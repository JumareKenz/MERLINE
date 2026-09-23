'use client';

import Link from 'next/link';
import { ArrowUpRight, FileBarChart2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { ExportButtons } from '@/components/analysis/export-buttons';
import { useRequestReport } from '@/hooks/use-analysis-reports';
import { useSession } from '@/hooks/use-session';
import { formatDateTime } from '@/lib/utils';
import type { AnalysisReport } from '@/types/analysis-report';

/**
 * The project-level report: the latest one front and centre, with its
 * downloads, plus earlier versions and any briefs asked for.
 */
export function ProjectReportPanel({
  projectId,
  reports,
  eligibleInterviews,
}: {
  projectId: string;
  reports: AnalysisReport[];
  eligibleInterviews: number;
}) {
  const session = useSession();
  const request = useRequestReport();
  const projectReports = reports.filter((r) => r.scope === 'PROJECT');
  const briefs = reports.filter((r) => r.scope === 'CUSTOM');
  const latest = projectReports[0];
  const latestDone = projectReports.find((r) => r.status === 'COMPLETED');
  const busy = latest && (latest.status === 'PENDING' || latest.status === 'PROCESSING');
  const canCreate = session.can('create.reports') && session.can('use.ai');

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-navy px-6 py-7 text-white shadow-soft sm:px-8">
        <div aria-hidden className="absolute -right-20 -top-20 h-60 w-60 rotate-12 rounded-[40px] bg-white/[0.05]" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-lemon-500">Project report</p>
            <h2 className="mt-2 font-display text-[22px] font-semibold leading-snug">
              {latestDone ? latestDone.title : 'One report from every interview in this project'}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-white/75">
              {latestDone
                ? `Generated ${formatDateTime(latestDone.completedAt ?? latestDone.createdAt)} from ${latestDone.sourceCount} interview${latestDone.sourceCount === 1 ? '' : 's'}.`
                : `Findings, how widely each is shared, divergent views, recommendations and verbatim quotations with timestamps, drawn from ${eligibleInterviews} transcribed interview${eligibleInterviews === 1 ? '' : 's'}. Interview reports are written first where missing.`}
            </p>
            {busy && (
              <p className="mt-3 inline-flex items-center gap-2 text-[14px] text-lemon-500" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Writing a new version…
              </p>
            )}
            {latest?.status === 'FAILED' && <p className="mt-3 text-[14px] text-white/85">Last attempt failed: {latest.errorMessage}</p>}
          </div>
          <div className="flex flex-col items-start gap-3">
            {latestDone && (
              <Button variant="accent" asChild>
                <Link href={`/analysis/${latestDone.id}`}>
                  <FileBarChart2 className="h-4 w-4" aria-hidden /> Open report
                </Link>
              </Button>
            )}
            {canCreate && !busy && (
              <Button
                variant={latestDone ? 'secondary' : 'accent'}
                loading={request.isPending}
                disabled={eligibleInterviews === 0}
                onClick={() => request.mutate({ scope: 'PROJECT', projectId })}
              >
                <Sparkles className="h-4 w-4" aria-hidden /> {latestDone ? 'Generate a new version' : 'Generate project report'}
              </Button>
            )}
            {eligibleInterviews === 0 && <p className="text-[13px] text-white/70">Needs at least one transcribed interview with consent to AI analysis.</p>}
          </div>
        </div>
        {latestDone && session.can('export.reports') && (
          <div className="relative mt-6 border-t border-white/15 pt-5">
            <ExportButtons reportId={latestDone.id} name={latestDone.title} onDark />
          </div>
        )}
      </section>

      {(projectReports.length > 1 || briefs.length > 0) && (
        <section>
          <h3 className="mb-3 text-[15px] font-semibold text-foreground">All reports and briefs</h3>
          <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-background-elevated shadow-soft">
            {[...projectReports, ...briefs]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((r) => (
                <li key={r.id}>
                  <Link href={`/analysis/${r.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-background-hover">
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-foreground">{r.title}</span>
                      <span className="text-[12.5px] text-foreground-tertiary">
                        {r.scope === 'CUSTOM' ? 'Brief' : 'Project report'} · {formatDateTime(r.createdAt)}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <StatusBadge status={r.status} size="sm" />
                      <ArrowUpRight className="h-4 w-4 text-foreground-tertiary" aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
