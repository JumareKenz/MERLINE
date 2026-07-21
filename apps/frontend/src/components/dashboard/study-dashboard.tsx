'use client';

import { useStudyDashboard } from '@/hooks/use-dashboard';
import { KpiCard, KpiCardSkeleton } from './kpi-card';
import { ProgressGauge, ProgressGaugeSkeleton } from './progress-gauge';
import { IndicatorBreakdown } from './indicator-breakdown';
import { DataCollectionProgress } from './data-collection-progress';
import { DashboardChart } from './dashboard-chart';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { BarChart3 } from 'lucide-react';

interface StudyDashboardProps {
  studyId: string;
}

export function StudyDashboard({ studyId }: StudyDashboardProps) {
  const { data: res, isLoading, isError, error, refetch } = useStudyDashboard(studyId);

  if (isError) {
    return <ErrorState message={error?.message || 'Failed to load study dashboard'} onRetry={() => refetch()} />;
  }

  const dashboard = res?.data?.data;

  if (!isLoading && !dashboard) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-12 w-12" />}
        title="No dashboard data"
        description="Deploy questionnaires and collect data to populate this dashboard."
      />
    );
  }

  const kpis = dashboard?.kpis;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Study Dashboard</h2>
        <p className="text-foreground-secondary mt-1">Auto-generated metrics for this study</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => <KpiCardSkeleton key={i} />)}
          </>
        ) : (
          <>
            <KpiCard label="Total Submissions" value={kpis?.total_submissions.toLocaleString() || 0} />
            <KpiCard label="Pending Review" value={kpis?.pending_review || 0} trend={{ direction: kpis && kpis.pending_review > 0 ? 'up' : 'flat', value: 'needs attention' }} />
            <KpiCard label="Approved" value={kpis?.approved || 0} trend={{ direction: 'up', value: 'approved' }} />
            <KpiCard label="Active Enumerators" value={kpis?.enumerators_active || 0} />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          <DashboardChart
            type="line_chart"
            title="Submission Trend"
            isLoading={isLoading}
            data={dashboard?.submission_trend}
            onRetry={() => refetch()}
          />
          <DataCollectionProgress
            enumerators={dashboard?.enumerator_progress}
            isLoading={isLoading}
            error={isError ? error : null}
            onRetry={() => refetch()}
          />
        </div>
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-lg bg-background-elevated p-5 shadow-1">
            <h3 className="text-sm font-semibold text-foreground-secondary mb-3">Completion</h3>
            {isLoading ? (
              <ProgressGaugeSkeleton />
            ) : (
              <ProgressGauge
                value={kpis?.completion_percentage || 0}
                label="Overall completion"
                size="lg"
              />
            )}
          </div>
          <IndicatorBreakdown
            indicators={dashboard?.indicator_achievement}
            isLoading={isLoading}
            error={isError ? error : null}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    </div>
  );
}
