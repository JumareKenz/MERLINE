'use client';

import { useExecutiveDashboard, useDashboardAlerts } from '@/hooks/use-dashboard';
import { DashboardKpiRow } from './dashboard-kpi-row';
import { DashboardAlertBanner } from './dashboard-alert-banner';
import { DashboardAlertList } from './dashboard-alert-list';
import { DashboardChart } from './dashboard-chart';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ExecutiveDashboardProps {
  dateRange?: string;
  onDateRangeChange?: (range: string) => void;
}

export function ExecutiveDashboard({ dateRange = 'last_30d', onDateRangeChange }: ExecutiveDashboardProps) {
  const { data: summaryRes, isLoading: summaryLoading, isError: summaryError, refetch: refetchSummary } = useExecutiveDashboard(dateRange);
  const { data: alertsRes, isLoading: alertsLoading, isError: alertsError, refetch: refetchAlerts } = useDashboardAlerts();

  const summary = summaryRes?.data?.data;
  const alerts = alertsRes?.data?.data;

  if (summaryError && !summaryLoading) {
    return <ErrorState message="Failed to load dashboard" onRetry={() => refetchSummary()} />;
  }

  const hasData = summary && (summary.total_studies > 0 || summary.total_submissions > 0);

  if (!hasData && !summaryLoading) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={<LayoutDashboard className="h-12 w-12" />}
          title="Welcome to Merline!"
          description="Create your first project to start tracking MERL activities."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-foreground-secondary mt-1">
            Organization-wide overview of your MERL activities
          </p>
        </div>
        {onDateRangeChange && (
          <Select value={dateRange} onValueChange={onDateRangeChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7d">Last 7 days</SelectItem>
              <SelectItem value="last_30d">Last 30 days</SelectItem>
              <SelectItem value="last_90d">Last quarter</SelectItem>
              <SelectItem value="this_year">This year</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <DashboardAlertBanner alerts={alerts || []} />

      <DashboardKpiRow data={summary} isLoading={summaryLoading} />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-4">
          <DashboardChart
            type="line_chart"
            title="Submission Trend"
            isLoading={summaryLoading}
            onRetry={() => refetchSummary()}
          />
        </div>
        <div className="lg:col-span-4 space-y-4">
          <DashboardAlertList
            alerts={alerts}
            isLoading={alertsLoading}
            error={alertsError ? new Error('Failed to load alerts') : null}
            onRetry={() => refetchAlerts()}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardChart type="bar_chart" title="Studies by Status" isLoading={summaryLoading} />
        <DashboardChart type="pie_chart" title="Indicator Coverage" isLoading={summaryLoading} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trend Data</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 animate-skeleton-pulse rounded bg-neutral-200/50" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {summary?.trend_data?.slice(0, 5).map((item) => (
                  <div key={item.period} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                    <span className="text-sm">{item.period}</span>
                    <span className="text-sm font-medium">{item.submissions} submissions</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
