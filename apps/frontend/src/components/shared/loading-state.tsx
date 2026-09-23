import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingStateProps {
  /** Accessible label; not shown visually. */
  message?: string;
  className?: string;
  rows?: number;
}

/** Skeleton rows shaped like the content they stand in for — no spinner walls. */
export function LoadingState({ message = 'Loading', className, rows = 4 }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className={cn('space-y-3 py-2', className)}>
      <span className="sr-only">{message}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg px-1 py-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
