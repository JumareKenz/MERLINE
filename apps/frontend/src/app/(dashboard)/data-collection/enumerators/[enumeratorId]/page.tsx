'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEnumeratorAssignments, useEnumeratorLoad } from '@/hooks/use-assignments';
import { useEnumeratorSubmissions, useEnumeratorStats } from '@/hooks/use-submissions';
import { EnumeratorPerformance } from '@/components/data-collection/enumerator-performance';
import { SubmissionTable } from '@/components/submissions/submission-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, BarChart3 } from 'lucide-react';

export default function EnumeratorPerformancePage() {
  const { enumeratorId } = useParams<{ enumeratorId: string }>();

  const { data: assignmentsData, isLoading: assignLoading } = useEnumeratorAssignments(enumeratorId);
  const { data: loadData, isLoading: loadLoading } = useEnumeratorLoad(enumeratorId);
  const { data: subsData, isLoading: subsLoading, isError, error, refetch } = useEnumeratorSubmissions(enumeratorId);
  const { data: statsData } = useEnumeratorStats(enumeratorId);

  const isLoading = assignLoading || loadLoading || subsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={error?.message} onRetry={() => refetch()} />;
  }

  const submissions = subsData?.data?.data || [];
  const load = loadData?.data?.data;
  const stats = statsData?.data?.data as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/submissions" className="inline-flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" />
          Back to Submissions
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Enumerator Performance</h1>
        <p className="text-foreground-secondary mt-1">ID: {enumeratorId.slice(0, 8)}...</p>
      </div>

      <EnumeratorPerformance
        totalSubmissions={submissions.length}
        approvedCount={submissions.filter((s) => s.status === 'approved').length}
        rejectedCount={submissions.filter((s) => s.status === 'rejected').length}
        qualityScore={stats?.avg_quality_score as number ?? 0}
        avgDuration={stats?.avg_duration as number ?? 0}
        trend={stats?.trend as 'up' | 'down' | 'stable' ?? 'stable'}
      />

      {load && (
        <Card>
          <CardHeader>
            <CardTitle>Assignment Load</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{load.total}</p>
                <p className="text-xs text-foreground-secondary">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{load.in_progress}</p>
                <p className="text-xs text-foreground-secondary">In Progress</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{load.completed}</p>
                <p className="text-xs text-foreground-secondary">Completed</p>
              </div>
            </div>
            {load.total > 0 && (
              <div className="mt-4">
                <Progress value={Math.round((load.completed / load.total) * 100)} className="h-3" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quality Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-center">
            <BarChart3 className="h-8 w-8 text-foreground-tertiary mb-2" />
            <p className="text-sm text-foreground-secondary">
              Quality trend chart placeholder — integrate with ECharts
            </p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">Submissions</h2>
        <SubmissionTable data={submissions} isLoading={subsLoading} />
      </div>
    </div>
  );
}
