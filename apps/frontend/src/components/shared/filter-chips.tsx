'use client';

import { cn } from '@/lib/utils';

interface FilterChipsProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (value: T) => void;
}

/** A compact single-choice filter. Radio semantics; counts are optional. */
export function FilterChips<T extends string>({ label, value, options, onChange }: FilterChipsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg bg-background-inset p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-8 rounded-md px-3 text-[13px] font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected ? 'bg-background-elevated text-foreground shadow-soft' : 'text-foreground-secondary hover:text-foreground',
            )}
          >
            {option.label}
            {option.count !== undefined && <span className="ml-1.5 tabular-nums text-foreground-tertiary">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
