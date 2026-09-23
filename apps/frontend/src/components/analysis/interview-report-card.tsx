'use client';

import Link from 'next/link';
import { ArrowUpRight, Loader2, RotateCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportButtons } from '@/components/analysis/export-buttons';
import { useAnalysisReports, useRequestReport } from '@/hooks/use-analysis-reports';
import { useSession } from '@/hooks/use-session';
import { formatDateTime } from '@/lib/utils';

/** The interview's own report: status, open, regenerate and download. */
export function InterviewReportCard({
  interviewId,
  hasTranscript,
  aiAllowed,
}: {
  interviewId: string;
  hasTranscript: boolean;
  aiAllowed: boolean;
}) {
  const session = useSession();
  const { data: reports = [], isLoading } = useAnalysisReports({ interviewId });
  const request = useRequestReport();
  const latest = reports.find((r) => r.scope === 'INTERVIEW');
  const done = reports.find((r) => r.scope === 'INTERVIEW' && r.status === 'COMPLETED');
  const busy = latest && (latest.status === 'PENDING' || latest.status === 'PROCESSING');
  const canCreate = session.can('create.reports') && session.can('use.ai');

  if (isLoading) return <p className="text-[14px] text-foreground-tertiary">Loading…</p>;

  return (
    <div className="space-y-3 text-[14px]">
      {done ? (
        <>
          <Link href={`/analysis/${done.id}`} className="group block">
            <span className="block font-semibold leading-snug text-foreground group-hover:text-foreground-link">{done.title}</span>
            <span className="mt-0.5 inline-flex items-center gap-1 text-[13px] text-foreground-link">
              Open report <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </Link>
          <p className="text-[12.5px] text-foreground-tertiary">Generated {formatDateTime(done.completedAt ?? done.createdAt)}</p>
          {session.can('export.reports') && <ExportButtons reportId={done.id} name={done.title} size="sm" />}
        </>
      ) : (
        <p className="text-foreground-secondary">
          {!aiAllowed
            ? 'Consent does not permit AI analysis of this interview.'
            : !hasTranscript
              ? 'A report can be written once the recording is transcribed.'
              : 'A structured analysis of this interview: summary, themes, quotations with timestamps, recommendations.'}
        </p>
      )}
      {busy && (
        <p className="inline-flex items-center gap-2 text-foreground-secondary" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Writing the report…
        </p>
      )}
      {latest?.status === 'FAILED' && <p className="text-[13px] text-foreground-error">Last attempt failed: {latest.errorMessage}</p>}
      {canCreate && aiAllowed && hasTranscript && !busy && (
        <Button
          size="sm"
          variant={done ? 'ghost' : 'secondary'}
          loading={request.isPending}
          onClick={() => request.mutate({ scope: 'INTERVIEW', interviewId })}
        >
          {done ? <RotateCw className="h-3.5 w-3.5" aria-hidden /> : <Sparkles className="h-3.5 w-3.5" aria-hidden />}
          {done ? 'Regenerate' : 'Write interview report'}
        </Button>
      )}
    </div>
  );
}
