'use client';

import { cn } from '@/lib/utils';

interface AssignmentProgressProps {
  target: number;
  completed: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function AssignmentProgress({ target, completed, showLabel = true, size = 'md' }: AssignmentProgressProps) {
  const percentage = target > 0 ? Math.min(Math.round((completed / target) * 100), 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <div className={cn('flex-1 rounded-full bg-neutral-200', size === 'sm' ? 'h-2' : 'h-3')}>
        <div
          className={cn(
            'h-full rounded-full transition-all',
            percentage >= 100 ? 'bg-success' : percentage >= 50 ? 'bg-primary' : 'bg-warning'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-foreground-secondary whitespace-nowrap">
          {completed}/{target}
        </span>
      )}
    </div>
  );
}
