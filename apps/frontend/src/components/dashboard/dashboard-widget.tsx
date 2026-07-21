import type { DashboardWidget } from '@/types/dashboard';
import { DashboardChart } from './dashboard-chart';

interface DashboardWidgetRendererProps {
  widget: DashboardWidget;
  data?: unknown;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function DashboardWidgetRenderer({ widget, data, isLoading, error, onRetry }: DashboardWidgetRendererProps) {
  return (
    <DashboardChart
      type={widget.type}
      title={widget.title}
      data={data}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    />
  );
}
