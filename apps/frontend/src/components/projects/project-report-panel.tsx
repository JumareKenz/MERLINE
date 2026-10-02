'use client';

import Link from 'next/link';
import { ArrowUpRight, FileBarChart2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { ExportButtons } from '@/components/analysis/export-buttons';
import { useTypeUsage } from '@/hooks/use-interview-types';
import { typeLabel } from '@/lib/interview-types';
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
  // The headline report covers every type; per-type reports are listed below.
  const projectReports = reports.filter((r) => r.scope === 'PROJECT' && !r.interviewType);
  const typeReports = reports.filter((r) => r.scope === 'PROJECT' && !!r.interviewType);
  const usage = useTypeUsage(projectId);
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
                : `Findings, how widely each is shared, divergent views, recommendations and verbatim quotations with timestamps, drawn from ${eligibleInterviews} approved, transcribed interview${eligibleInterviews === 1 ? '' : 's'}. Interview reports are written first where missing.`}
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
            {eligibleInterviews === 0 && <p className="text-[13px] text-white/70">Needs at least one approved transcript with consent to AI analysis.</p>}
          </div>
        </div>
        {latestDone && session.can('export.reports') && (
          <div className="relative mt-6 border-t border-white/15 pt-5">
            <ExportButtons reportId={latestDone.id} name={latestDone.title} onDark />
          </div>
        )}
      </section>

      {(usage.data ?? []).length > 0 && (
        <section aria-labelledby="by-type-h">
          <h3 id="by-type-h" className="mb-1 text-[15px] font-semibold text-foreground">
            By interview type
          </h3>
          <p className="mb-3 max-w-2xl text-[13px] text-foreground-secondary">
            Each type can have its own report. The all-types report above compares them; a type report looks at that type alone.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border-subtle bg-background-elevated shadow-soft">
            <table className="w-full min-w-[640px] text-left text-[14px]">
              <thead>
                <tr className="bg-background-surface text-[12px] uppercase tracking-[0.06em] text-foreground-tertiary">
                  <th scope="col" className="px-4 py-2.5 font-semibold">Type</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Interviews</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Awaiting approval</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Approved</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Report</th>
                </tr>
              </thead>
              <tbody>
                {(usage.data ?? []).map((u) => {
                  const mine = typeReports.filter((r) => r.interviewType === u.type);
                  const done = mine.find((r) => r.status === 'COMPLETED');
                  const working = mine.some((r) => r.status === 'PENDING' || r.status === 'PROCESSING');
                  return (
                    <tr key={u.type} className="border-t border-border-subtle">
                      <td className="px-4 py-2.5 font-medium text-foreground">{typeLabel(u.type)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{u.interviews}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{u.awaitingApproval}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{u.approved}</td>
                      <td className="px-4 py-2.5">
                        <span className="flex flex-wrap items-center gap-2">
                          {done && (
                            <Link href={`/analysis/${done.id}`} className="font-medium text-foreground-link hover:underline">
                              Open
                            </Link>
                          )}
                          {working && (
                            <span className="inline-flex items-center gap-1.5 text-foreground-secondary" role="status">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Writing…
                            </span>
                          )}
                          {canCreate && !working && (
                            <Button
                              size="sm"
                              variant="quiet"
                              disabled={u.approved === 0 || request.isPending}
                              onClick={() => request.mutate({ scope: 'PROJECT', projectId, interviewType: u.type })}
                            >
                              <Sparkles className="h-3.5 w-3.5" aria-hidden /> {done ? 'New version' : 'Generate'}
                            </Button>
                          )}
                          {u.approved === 0 && <span className="text-[12.5px] text-foreground-tertiary">Needs an approved transcript</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
