'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { BarChart3 } from 'lucide-react';
import { useAiMetrics } from '@/hooks/use-ai';

export function AiMetricsDashboard() {
  const { data, isLoading, error, refetch } = useAiMetrics();

  const stats = useMemo(() => {
    if (!data?.data?.data) return null;
    return data.data.data;
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState message="Failed to load AI metrics" onRetry={() => refetch()} />;
  }

  if (!stats) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-12 w-12" />}
        title="No metrics yet"
        description="AI usage data will appear here once you start using the AI assistant."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Inferences</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total_inferences.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${stats.total_cost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(stats.avg_latency_ms / 1000).toFixed(1)}s</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total_tokens.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage by Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.agent_breakdown).length === 0 ? (
              <p className="text-sm text-muted-foreground">No agent usage data yet.</p>
            ) : (
              Object.entries(stats.agent_breakdown).map(([agent, metrics]) => (
                <div key={agent} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium capitalize">{agent.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">{metrics.inferences} inferences</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>${metrics.cost.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{(metrics.avg_latency_ms / 1000).toFixed(1)}s avg</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
