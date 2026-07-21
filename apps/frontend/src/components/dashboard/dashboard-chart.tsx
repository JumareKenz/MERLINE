'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import type { DashboardWidgetType } from '@/types/dashboard';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

interface ChartProps {
  type: DashboardWidgetType;
  title: string;
  data?: unknown;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  height?: number;
}

function BarChart({ data, height }: { data?: unknown; height?: number }) {
  const values = Array.isArray(data) ? data : [];
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  
  const option = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category' as const, data: labels.slice(0, values.length), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value' as const, min: 0 },
    series: [{ type: 'bar' as const, data: values, itemStyle: { color: '#2563eb', borderRadius: [4, 4, 0, 0] } }],
  };

  return <ReactECharts option={option} style={{ height: height || 200 }} />;
}

function LineChart({ data, height }: { data?: unknown; height?: number }) {
  const values = Array.isArray(data) ? data : [];
  const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'];

  const option = {
    tooltip: { trigger: 'axis' as const },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category' as const, data: labels.slice(0, values.length), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value' as const, min: 0 },
    series: [{ type: 'line' as const, data: values, smooth: true, lineStyle: { color: '#2563eb', width: 2 }, areaStyle: { color: 'rgba(37, 99, 235, 0.1)' }, symbol: 'circle', symbolSize: 6 }],
  };

  return <ReactECharts option={option} style={{ height: height || 200 }} />;
}

function PieChart({ data, height }: { data?: unknown; height?: number }) {
  const values = Array.isArray(data) ? data : [];
  const total = values.reduce((s: number, v: unknown) => s + (Number(v) || 0), 0);
  const colors = ['#2563eb', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'];
  const labels = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E', 'Category F'];

  const option = {
    tooltip: { trigger: 'item' as const, formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie' as const,
      radius: ['40%', '70%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      label: { show: true, formatter: '{b}: {d}%', fontSize: 11 },
      data: values.map((v: unknown, i: number) => ({
        value: v,
        name: labels[i] || `Item ${i + 1}`,
        itemStyle: { color: colors[i % colors.length] },
      })),
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.2)' } },
    }],
  };

  return <ReactECharts option={option} style={{ height: height || 200 }} />;
}

export function DashboardChart({ type, title, data, isLoading, error, onRetry, height = 250 }: ChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" style={{ height }} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorState message={error.message} onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {type === 'bar_chart' && <BarChart data={data} height={height} />}
        {type === 'line_chart' && <LineChart data={data} height={height} />}
        {type === 'pie_chart' && <PieChart data={data} height={height} />}
        {type === 'kpi_card' && (
          <div className="text-3xl font-bold text-foreground">
            {data !== undefined ? String(data) : '-'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
