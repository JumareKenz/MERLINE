'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { EmptyState } from '@/components/shared/empty-state';
import { useAiSessions } from '@/hooks/use-ai';
import { Search, FileCode } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export function AiPromptEditor() {
  const [search, setSearch] = useState('');
  const { data, isLoading, error, refetch } = useAiSessions();

  if (error) {
    return <ErrorState message="Failed to load prompts" onRetry={() => refetch()} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prompt Registry</CardTitle>
        <p className="text-sm text-muted-foreground">Browse AI system prompts (read-only)</p>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <EmptyState
              icon={<FileCode className="h-12 w-12" />}
              title="Prompt Viewer"
              description="Prompts will be available once the AI system is configured. This is a read-only view for audit purposes."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
