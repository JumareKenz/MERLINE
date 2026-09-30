'use client';

import { LoadingState } from '@/components/shared/loading-state';
import { useResearchProjects } from '@/hooks/use-research-projects';

/** Checkbox list of active projects, with select all / none. */
export function ProjectPicker({
  value,
  onChange,
  describedById,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  describedById?: string;
}) {
  const { data, isLoading } = useResearchProjects();
  const projects = (data?.items ?? []).filter((p) => p.status !== 'archived');
  const all = projects.length > 0 && projects.every((p) => value.includes(p.id));

  if (isLoading) return <LoadingState rows={2} />;
  if (projects.length === 0) {
    return <p className="text-[14px] text-foreground-secondary">No active projects yet. Create a project first; you can assign it later.</p>;
  }

  return (
    <div aria-describedby={describedById}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] text-foreground-tertiary">
          {value.length} of {projects.length} selected
        </span>
        <button
          type="button"
          className="text-[13px] font-medium text-foreground-link hover:underline"
          onClick={() => onChange(all ? [] : projects.map((p) => p.id))}
        >
          {all ? 'Clear all' : 'Select all projects'}
        </button>
      </div>
      <ul className="max-h-56 divide-y divide-border-subtle overflow-y-auto rounded-lg border border-border-subtle">
        {projects.map((p) => {
          const checked = value.includes(p.id);
          return (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-background-hover">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(var(--brand-navy))]"
                  checked={checked}
                  onChange={() => onChange(checked ? value.filter((id) => id !== p.id) : [...value, p.id])}
                />
                <span className="text-[14px] text-foreground">{p.name}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
