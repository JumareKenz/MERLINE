'use client';

import { useParams, useRouter } from 'next/navigation';
import { useStudy } from '@/hooks/use-studies';
import { useSubmissions } from '@/hooks/use-submissions';
import { useIndicators } from '@/hooks/use-indicators';
import { StudyDashboard } from '@/components/dashboard/study-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, BarChart3, Brain, FileText, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

function QualityScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? 'text-success' : score >= 60 ? 'text-amber-600' : 'text-error';
  const bg = score >= 80 ? 'bg-success/10' : score >= 60 ? 'bg-amber-500/10' : 'bg-error/10';
  const ring = score >= 80 ? 'ring-success/30' : score >= 60 ? 'ring-amber-500/30' : 'ring-error/30';
  return (
    <div className={cn('rounded-lg p-4 text-center ring-1', bg, ring)}>
      <p className={cn('text-[28px] font-semibold tabular-nums', color)}>{score}%</p>
      <p className="text-[12px] text-foreground-tertiary mt-0.5">{label}</p>
    </div>
  );
}

export default function AnalyzePage() {
  const { studyId } = useParams<{ studyId: string }>();
  const router = useRouter();
  const { data: studyData, isLoading } = useStudy(studyId);
  const { data: submissionsData } = useSubmissions({ study_id: studyId, per_page: 100 });
  const { data: indicatorsData } = useIndicators({ study_id: studyId });

  const study = studyData?.data?.data;
  const submissions = submissionsData?.data?.data || [];
  const indicators = indicatorsData?.data?.data || [];

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map((i) => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!study) return <ErrorState message="Study not found" />;

  const approved = submissions.filter((s: any) => ['approved','APPROVED'].includes(s.status));
  const flagged = submissions.filter((s: any) => s.flagged);
  const avgQuality = submissions.length > 0
    ? Math.round(submissions.reduce((sum: number, s: any) => sum + (s.quality_score ?? 0), 0) / submissions.length)
    : 0;
  const completionRate = submissions.length > 0
    ? Math.round((approved.length / submissions.length) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/studies/${studyId}`} className="text-foreground-tertiary hover:text-foreground text-[12px] flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> {study.title}
            </Link>
          </div>
          <h1 className="text-[17px] font-semibold tracking-tight">Intelligence Engine</h1>
          <p className="text-[13px] text-foreground-tertiary mt-0.5">
            Data quality analysis, indicator tracking, and AI-generated insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={study.status} />
          <Link href={`/reports?study=${studyId}`}>
            <Button size="sm" className="h-8 text-[13px]">
              <FileText className="h-3.5 w-3.5 mr-1.5" /> Generate Report
            </Button>
          </Link>
        </div>
      </div>

      {/* Quality summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QualityScoreGauge score={avgQuality} label="Avg Data Quality" />
        <QualityScoreGauge score={completionRate} label="Approval Rate" />
        <div className="rounded-lg bg-background-subtle border border-border p-4 text-center">
          <p className="text-[28px] font-semibold tabular-nums">{submissions.length}</p>
          <p className="text-[12px] text-foreground-tertiary mt-0.5">Total Submissions</p>
        </div>
        <div className={cn(
          'rounded-lg p-4 text-center',
          flagged.length > 0 ? 'bg-error/10 ring-1 ring-error/30' : 'bg-background-subtle border border-border',
        )}>
          <p className={cn('text-[28px] font-semibold tabular-nums', flagged.length > 0 ? 'text-error' : '')}>
            {flagged.length}
          </p>
          <p className="text-[12px] text-foreground-tertiary mt-0.5">Flagged Submissions</p>
        </div>
      </div>

      {/* AI insight banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">
        <Brain className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-[13px] font-medium text-foreground">AI Analysis Available</p>
          <p className="text-[12px] text-foreground-secondary mt-0.5">
            Open the study&rsquo;s AI Copilot and ask for anomaly detection, statistical summaries, or to generate an executive insight narrative for your stakeholders.
          </p>
        </div>
        <Link href={`/studies/${studyId}/design/review`} className="shrink-0">
          <Button size="sm" variant="outline" className="h-7 px-2.5 text-[12px] gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Open Copilot
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Study Dashboard</TabsTrigger>
          <TabsTrigger value="indicators">Indicator Tracking</TabsTrigger>
          <TabsTrigger value="quality">Data Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="pt-4">
          <StudyDashboard studyId={studyId} />
        </TabsContent>

        <TabsContent value="indicators" className="pt-4">
          <div className="space-y-4">
            {indicators.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <BarChart3 className="h-8 w-8 text-foreground-tertiary mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-[13px] font-medium mb-1">No indicators linked</p>
                  <p className="text-[12px] text-foreground-tertiary mb-4">Link indicators in the Design Workspace to track performance.</p>
                  <Link href={`/studies/${studyId}/design/indicators`}>
                    <Button size="sm" className="h-8 text-[13px]">Go to Indicators</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {indicators.map((ind: any) => {
                  const current = ind.current_value ?? ind.values?.[0]?.value;
                  const target = ind.target_value;
                  const pct = current != null && target != null && target > 0
                    ? Math.min(Math.round((current / target) * 100), 100)
                    : null;
                  const ragColor = pct == null ? 'text-foreground-tertiary'
                    : pct >= 90 ? 'text-success'
                    : pct >= 60 ? 'text-amber-600'
                    : 'text-error';
                  return (
                    <Link key={ind.id} href={`/indicators/${ind.id}`}>
                      <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <p className="text-[13px] font-medium mb-2 leading-snug">{ind.name}</p>
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-[22px] font-semibold tabular-nums">
                              {current != null ? current.toLocaleString() : '—'}
                            </span>
                            {ind.unit && <span className="text-[12px] text-foreground-tertiary">{ind.unit}</span>}
                            {pct != null && (
                              <span className={cn('text-[12px] font-semibold ml-auto', ragColor)}>
                                {pct}%
                              </span>
                            )}
                          </div>
                          {pct != null && (
                            <div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  pct >= 90 ? 'bg-success' : pct >= 60 ? 'bg-amber-500' : 'bg-error',
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                          {target != null && (
                            <p className="text-[11px] text-foreground-tertiary mt-1.5">
                              Target: {target.toLocaleString()} {ind.unit || ''}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="quality" className="pt-4">
          <div className="space-y-4">
            {submissions.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <TrendingUp className="h-8 w-8 text-foreground-tertiary mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-[13px] font-medium">No submission data yet</p>
                  <p className="text-[12px] text-foreground-tertiary mt-1">Quality metrics will appear once data is collected.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-[12px] text-foreground-tertiary mb-1">Average Quality Score</p>
                      <p className={cn('text-[28px] font-semibold', avgQuality >= 80 ? 'text-success' : avgQuality >= 60 ? 'text-amber-600' : 'text-error')}>
                        {avgQuality}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-[12px] text-foreground-tertiary mb-1">High Quality (≥80%)</p>
                      <p className="text-[28px] font-semibold text-success">
                        {submissions.filter((s: any) => (s.quality_score ?? 0) >= 80).length}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-[12px] text-foreground-tertiary mb-1">Low Quality (&lt;60%)</p>
                      <p className="text-[28px] font-semibold text-error">
                        {submissions.filter((s: any) => (s.quality_score ?? 100) < 60).length}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Flagged submissions */}
                {flagged.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-error" />
                        Flagged Submissions ({flagged.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="divide-y divide-border">
                        {flagged.slice(0, 10).map((s: any) => (
                          <Link key={s.id} href={`/submissions/${s.id}`} className="flex items-center gap-3 py-2.5 hover:bg-background-hover -mx-4 px-4 transition-colors">
                            <AlertTriangle className="h-4 w-4 text-error shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-mono truncate">#{s.id.slice(0, 8)}…</p>
                              <p className="text-[11px] text-foreground-tertiary">{s.enumerator?.name ?? 'Unknown'}</p>
                            </div>
                            {s.quality_score != null && (
                              <span className="text-[12px] text-error font-medium">Q: {s.quality_score}%</span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
