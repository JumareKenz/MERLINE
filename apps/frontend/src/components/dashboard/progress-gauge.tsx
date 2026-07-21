'use client';

import { cn } from '@/lib/utils';

interface ProgressGaugeProps {
  value: number;
  max?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
}

const sizeMap = {
  sm: { width: 80, stroke: 6 },
  md: { width: 120, stroke: 8 },
  lg: { width: 160, stroke: 10 },
};

function getColor(value: number, max: number): string {
  const pct = (value / max) * 100;
  if (pct >= 80) return 'stroke-success';
  if (pct >= 50) return 'stroke-warning';
  return 'stroke-error';
}

export function ProgressGauge({ value, max = 100, label, size = 'md', showValue = true }: ProgressGaugeProps) {
  const { width, stroke } = sizeMap[size];
  const radius = (width - stroke) / 2;
  const circumference = radius * Math.PI;
  const pct = Math.min((value / max) * 100, 100);
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={width} height={width / 2 + stroke} className="overflow-visible">
        <path
          d={`M ${stroke / 2} ${width / 2} A ${radius} ${radius} 0 0 1 ${width - stroke / 2} ${width / 2}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-neutral-200 dark:text-neutral-700"
          strokeLinecap="round"
        />
        <path
          d={`M ${stroke / 2} ${width / 2} A ${radius} ${radius} 0 0 1 ${width - stroke / 2} ${width / 2}`}
          fill="none"
          strokeWidth={stroke}
          className={cn('transition-all duration-500', getColor(value, max))}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        {showValue && (
          <text
            x={width / 2}
            y={width / 2 + 4}
            textAnchor="middle"
            className="fill-foreground text-lg font-bold"
          >
            {Math.round(pct)}%
          </text>
        )}
      </svg>
      {label && <span className="text-xs text-foreground-secondary">{label}</span>}
    </div>
  );
}

export function ProgressGaugeSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="h-[68px] w-[120px] animate-skeleton-pulse rounded-full bg-neutral-200/50" />
      <div className="h-3 w-20 animate-skeleton-pulse rounded bg-neutral-200/50" />
    </div>
  );
}
