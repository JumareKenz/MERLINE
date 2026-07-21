'use client';

import { Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { formatRelativeTime } from '@/lib/utils';
import type { ProjectActivity } from '@/types/project';

interface ProjectTimelineProps {
  activities?: ProjectActivity[];
  isLoading?: boolean;
}

export function ProjectTimeline({ activities, isLoading }: ProjectTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-2 w-2 rounded-full mt-2" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities?.length) {
    return <EmptyState icon={<Clock className="h-8 w-8" />} title="No recent activity" description="Project activity such as study creation, team changes, and status updates will be recorded here." />;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-2 w-2 rounded-full bg-primary-300 mt-2" />
            <div className="w-px flex-1 bg-border" />
          </div>
          <div className="pb-4">
            <p className="text-sm">{activity.description}</p>
            <p className="text-xs text-foreground-secondary mt-0.5">{formatRelativeTime(activity.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
