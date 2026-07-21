import { KpiCard, KpiCardSkeleton } from './kpi-card';
import { Activity, FlaskConical, FolderKanban, Users } from 'lucide-react';
import type { DashboardSummary } from '@/types/dashboard';

interface DashboardKpiRowProps {
  data?: DashboardSummary;
  isLoading?: boolean;
}

export function DashboardKpiRow({ data, isLoading }: DashboardKpiRowProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <KpiCardSkeleton key={i} />)}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        icon={<FolderKanban className="h-5 w-5" />}
        label="Total Studies"
        value={data.total_studies}
        trend={{ direction: data.active_studies > 0 ? 'up' : 'flat', value: `${data.active_studies} active` }}
      />
      <KpiCard
        icon={<Activity className="h-5 w-5" />}
        label="Completion Rate"
        value={`${data.completion_rate}%`}
        trend={{ direction: data.completion_rate >= 50 ? 'up' : 'down', value: 'overall' }}
      />
      <KpiCard
        icon={<FlaskConical className="h-5 w-5" />}
        label="Total Submissions"
        value={data.total_submissions.toLocaleString()}
        trend={{ direction: 'up', value: 'all time' }}
      />
      <KpiCard
        icon={<Users className="h-5 w-5" />}
        label="Geographic Reach"
        value={data.geographic_reach}
        trend={{ direction: 'flat', value: 'regions' }}
      />
    </div>
  );
}
