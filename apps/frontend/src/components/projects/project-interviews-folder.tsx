'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRight, FileText, Loader2, Sparkles, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { useRequestReport } from '@/hooks/use-analysis-reports';
import { formatDate } from '@/lib/utils';
import type { AnalysisReport } from '@/types/analysis-report';
import type { Interview } from '@/types/interview';
import { interviewTypeLabel } from '@/types/research-project';
import type { TranscriptSummary } from '@/types/transcript';

const ORDER = ['KII', 'IDI', 'FGD', 'OTHER', ''];

interface Props {
  interviews: Interview[];
  isLoading: boolean;
  transcripts: TranscriptSummary[];
  reports: AnalysisReport[];
  /** Administrators see transcripts and reports; others see the interviews only. */
  showAnalysis: boolean;
  canGenerate: boolean;
}

function TranscriptCell({ transcript }: { transcript?: TranscriptSummary }) {
  if (!transcript) return <span className="text-[13px] text-foreground-tertiary">No transcript</span>;
  if (transcript.status !== 'COMPLETED') return <StatusBadge status={transcript.status} size="sm" />;
  return (
    <Link href={`/transcripts/${transcript.id}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground-link hover:underline">
      <FileText className="h-3.5 w-3.5" aria-hidden /> Transcript
    </Link>
  );
}

function ReportCell({
  interview,
  transcript,
  report,
  canGenerate,
}: {
  interview: Interview;
  transcript?: TranscriptSummary;
  report?: AnalysisReport;
  canGenerate: boolean;
}) {
  const request = useRequestReport();
  if (report && (report.status === 'PENDING' || report.status === 'PROCESSING')) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] text-foreground-secondary" role="status">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Writing…
      </span>
    );
  }
  if (report?.status === 'COMPLETED') {
    return (
      <Link href={`/analysis/${report.id}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-foreground-link hover:underline">
        Report <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    );
  }
  const ready = transcript?.status === 'COMPLETED' && (transcript._count?.segments ?? 1) > 0;
  const aiAllowed = interview.consent?.allowAiAnalysis !== false && !interview.consent?.withdrawnAt;
  if (!ready || !canGenerate) {
    return <span className="text-[13px] text-foreground-tertiary">{!aiAllowed ? 'No AI consent' : 'Needs transcript'}</span>;
  }
  if (!aiAllowed) return <span className="text-[13px] text-foreground-tertiary">No AI consent</span>;
  return (
    <Button
      size="sm"
      variant="quiet"
      loading={request.isPending}
      onClick={() => request.mutate({ scope: 'INTERVIEW', interviewId: interview.id })}
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden /> {report?.status === 'FAILED' ? 'Retry report' : 'Write report'}
    </Button>
  );
}

/**
 * The project as a folder: its interviews grouped by type, each with who
 * conducted it, when, and (for administrators) its transcript and report.
 */
export function ProjectInterviewsFolder({ interviews, isLoading, transcripts, reports, showAnalysis, canGenerate }: Props) {
  const latestTranscript = useMemo(() => {
    const map = new Map<string, TranscriptSummary>();
    for (const t of transcripts) if (!map.has(t.interviewId)) map.set(t.interviewId, t); // newest first
    return map;
  }, [transcripts]);
  const latestReport = useMemo(() => {
    const map = new Map<string, AnalysisReport>();
    for (const r of reports) if (r.scope === 'INTERVIEW' && r.interviewId && !map.has(r.interviewId)) map.set(r.interviewId, r);
    return map;
  }, [reports]);

  const groups = useMemo(() => {
    const by = new Map<string, Interview[]>();
    for (const iv of interviews) {
      const key = iv.type ?? '';
      by.set(key, [...(by.get(key) ?? []), iv]);
    }
    return [...by.entries()].sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));
  }, [interviews]);

  if (isLoading) return <LoadingState rows={4} />;
  if (interviews.length === 0) {
    return (
      <EmptyState
        size="inline"
        icon={<UserRound />}
        title="No interviews yet"
        description="Interviews appear here as your field team collects them. Add people to this project's field team to begin."
      />
    );
  }

  return (
    <div className="space-y-8">
      {groups.map(([type, list]) => {
        const done = list.filter((i) => i.status === 'COMPLETED').length;
        return (
          <section key={type || 'none'} aria-labelledby={`group-${type || 'none'}`}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 id={`group-${type || 'none'}`} className="text-[16px] font-semibold text-foreground">
                {interviewTypeLabel(type)}
                {type && <span className="ml-2 rounded bg-primary-50 px-1.5 py-0.5 text-[12px] font-semibold text-primary-700">{type}</span>}
              </h3>
              <p className="text-[13px] text-foreground-tertiary">
                {list.length} interview{list.length === 1 ? '' : 's'} · {done} completed
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border-subtle bg-background-elevated shadow-soft">
              <table className="w-full min-w-[720px] text-left text-[14px]">
                <thead>
                  <tr className="border-b border-border-subtle text-[12px] uppercase tracking-[0.06em] text-foreground-tertiary">
                    <th scope="col" className="px-4 py-2.5 font-semibold">Participant</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Date</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Interviewer</th>
                    {showAnalysis && <th scope="col" className="px-4 py-2.5 font-semibold">Transcript</th>}
                    {showAnalysis && <th scope="col" className="px-4 py-2.5 font-semibold">Report</th>}
                  </tr>
                </thead>
                <tbody>
                  {list.map((iv) => {
                    const t = latestTranscript.get(iv.id);
                    return (
                      <tr key={iv.id} className="border-b border-border-subtle last:border-b-0 hover:bg-background-hover">
                        <td className="px-4 py-3">
                          <Link href={`/interviews/${iv.id}`} className="font-medium text-foreground hover:text-foreground-link hover:underline">
                            {iv.participant?.displayName ?? 'Participant'}
                          </Link>
                          {iv.location && <span className="block text-[12.5px] text-foreground-tertiary">{iv.location}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={iv.status} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-[13px] text-foreground-secondary">
                          {formatDate(iv.startedAt ?? iv.scheduledAt ?? iv.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-foreground-secondary">
                          {iv.interviewer ? `${iv.interviewer.firstName} ${iv.interviewer.lastName}` : '—'}
                        </td>
                        {showAnalysis && (
                          <td className="px-4 py-3">
                            <TranscriptCell transcript={t} />
                          </td>
                        )}
                        {showAnalysis && (
                          <td className="px-4 py-3">
                            <ReportCell interview={iv} transcript={t} report={latestReport.get(iv.id)} canGenerate={canGenerate} />
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
