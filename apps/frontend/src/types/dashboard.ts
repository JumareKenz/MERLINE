export type DashboardWidgetType = 'kpi_card' | 'line_chart' | 'bar_chart' | 'pie_chart' | 'table' | 'map' | 'gauge' | 'progress_bar' | 'activity_feed' | 'alerts_list';

export interface DashboardSummary {
  total_studies: number;
  active_studies: number;
  completion_rate: number;
  total_submissions: number;
  indicator_coverage: number;
  geographic_reach: number;
  trend_data: { period: string; submissions: number; completions: number }[];
}

export interface StudyDashboardData {
  kpis: {
    total_submissions: number;
    pending_review: number;
    approved: number;
    rejected: number;
    enumerators_active: number;
    completion_percentage: number;
    quality_score: number;
  };
  submission_trend: { date: string; count: number }[];
  enumerator_progress: { id: string; name: string; submissions: number; approval_rate: number; quality_score: number }[];
  indicator_achievement: { id: string; name: string; target: number; current: number; percentage: number; rag: string }[];
}

export interface DashboardAlert {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  created_at: string;
}

export interface DashboardWidget {
  id: string;
  type: DashboardWidgetType;
  title: string;
  settings: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
}
