'use client';

import { cn } from '@/lib/utils';
import type { StudyStatus } from '@/types/study';

const LIFECYCLE_STAGES: { status: StudyStatus; label: string }[] = [
  { status: 'draft', label: 'Draft' },
  { status: 'in_design', label: 'Design' },
  { status: 'design_review', label: 'Review' },
  { status: 'approved', label: 'Approved' },
  { status: 'data_collection', label: 'Field' },
  { status: 'analysis', label: 'Analysis' },
  { status: 'completed', label: 'Complete' },
];

const STAGE_ORDER: Record<string, number> = {};
LIFECYCLE_STAGES.forEach((s, i) => { STAGE_ORDER[s.status] = i; });

interface StudyLifecycleProgressProps {
  status: StudyStatus;
}

export function StudyLifecycleProgress({ status }: StudyLifecycleProgressProps) {
  const currentIndex = STAGE_ORDER[status] ?? 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {LIFECYCLE_STAGES.map((stage, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <div key={stage.status} className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  isCompleted ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-400'
                )}
              >
                {index + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] mt-1 hidden sm:block',
                  isCurrent ? 'font-medium text-primary' : 'text-foreground-secondary'
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="relative mt-2">
        <div className="absolute top-0 left-0 h-1 bg-neutral-100 rounded-full w-full" />
        <div
          className="absolute top-0 left-0 h-1 bg-primary rounded-full transition-all duration-500"
          style={{ width: `${(currentIndex / (LIFECYCLE_STAGES.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
