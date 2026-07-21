'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadingState } from '@/components/shared/loading-state';
import { ListRestart, Search } from 'lucide-react';
import { useAiInferences } from '@/hooks/use-ai';
import { cn } from '@/lib/utils';

export function AiInferenceLog() {
  const [page, setPage] = useState(1);
  const [agentFilter, setAgentFilter] = useState('');
  const { data, isLoading, error, refetch } = useAiInferences({ page, per_page: 25 });

  if (error) {
    return <ErrorState message="Failed to load inference log" onRetry={() => refetch()} />;
  }

  const inferences = data?.data?.data || [];
  const meta = data?.data?.meta;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Inference Log</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <ListRestart className="mr-1 h-4 w-4" />
            Refresh
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by agent..."
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : inferences.length === 0 ? (
          <EmptyState
            icon={<ListRestart className="h-12 w-12" />}
            title="No inferences recorded"
            description="AI inference logs will appear here as you use the system."
          />
        ) : (
          <div className="space-y-3">
            {inferences
              .filter((inf) => !agentFilter || inf.agent.includes(agentFilter.toLowerCase()))
              .map((inference) => (
                <div key={inference.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div className="flex-1">
                    <p className="font-medium capitalize">{inference.agent.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      Model: {inference.model} &middot; {(inference.latency_ms / 1000).toFixed(1)}s
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{inference.tokens} tokens</p>
                    <p className="text-xs text-muted-foreground">${inference.cost.toFixed(4)}</p>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium',
                      inference.status === 'completed' ? 'bg-success/10 text-success' :
                      inference.status === 'failed' ? 'bg-error/10 text-error' :
                      'bg-warning/10 text-warning'
                    )}>
                      {inference.status}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}

        {meta && meta.total > meta.per_page && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(meta.current_page - 1) * meta.per_page + 1}-{Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={!meta.has_more} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
