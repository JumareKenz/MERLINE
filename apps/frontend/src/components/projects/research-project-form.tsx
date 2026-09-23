'use client';

import { useId, useState, type FormEvent } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  RESEARCH_METHODS,
  type ResearchMethod,
  type ResearchProject,
  type ResearchProjectInput,
} from '@/types/research-project';

interface Props {
  initial?: ResearchProject;
  submitLabel: string;
  isSubmitting?: boolean;
  onSubmit: (data: ResearchProjectInput) => void | Promise<void>;
  onCancel?: () => void;
}

function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

export function ResearchProjectForm({ initial, submitLabel, isSubmitting, onSubmit, onCancel }: Props) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [method, setMethod] = useState<ResearchMethod | undefined>(initial?.settings?.method);
  const [startDate, setStartDate] = useState(toDateInput(initial?.startDate));
  const [endDate, setEndDate] = useState(toDateInput(initial?.endDate));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = 'Give the project a name of at least 2 characters.';
    if (!method) next.method = 'Choose the interview method this project uses.';
    if (startDate && endDate && endDate < startDate) next.endDate = 'The end date must be after the start date.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    await onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      settings: { ...(initial?.settings ?? {}), method },
    });
  };

  const fieldError = (key: string) =>
    errors[key] ? (
      <p id={`${id}-${key}-error`} className="mt-1.5 text-[13px] text-foreground-error">
        {errors[key]}
      </p>
    ) : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-7">
      <div>
        <label htmlFor={`${id}-name`} className="mb-1.5 block text-[14px] font-medium text-foreground">
          Project name
        </label>
        <Input
          id={`${id}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={!!errors.name}
          aria-describedby={errors.name ? `${id}-name-error` : undefined}
          placeholder="e.g. Maternal health access, Kano 2026"
          autoFocus={!initial}
          maxLength={200}
        />
        {fieldError('name')}
      </div>

      <fieldset aria-describedby={errors.method ? `${id}-method-error` : undefined}>
        <legend className="mb-1 text-[14px] font-medium text-foreground">Interview method</legend>
        <p className="mb-3 text-[13px] text-foreground-tertiary">Sets how interviews in this project are described to your team.</p>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
          {RESEARCH_METHODS.map((m) => {
            const selected = method === m.value;
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setMethod(m.value)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3.5 text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected
                    ? 'border-primary bg-primary-50 ring-1 ring-primary'
                    : 'border-border bg-background-elevated hover:border-border-strong',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong',
                  )}
                >
                  {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span>
                  <span className="block text-[14px] font-medium text-foreground">
                    {m.label} <span className="font-normal text-foreground-tertiary">· {m.value}</span>
                  </span>
                  <span className="mt-0.5 block text-[13px] text-foreground-secondary">{m.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
        {fieldError('method')}
      </fieldset>

      <div>
        <label htmlFor={`${id}-desc`} className="mb-1.5 block text-[14px] font-medium text-foreground">
          Summary <span className="font-normal text-foreground-tertiary">(optional)</span>
        </label>
        <Textarea
          id={`${id}-desc`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Research question, population and setting."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-start`} className="mb-1.5 block text-[14px] font-medium text-foreground">
            Fieldwork starts <span className="font-normal text-foreground-tertiary">(optional)</span>
          </label>
          <Input id={`${id}-start`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`${id}-end`} className="mb-1.5 block text-[14px] font-medium text-foreground">
            Fieldwork ends <span className="font-normal text-foreground-tertiary">(optional)</span>
          </label>
          <Input
            id={`${id}-end`}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            error={!!errors.endDate}
            aria-describedby={errors.endDate ? `${id}-endDate-error` : undefined}
          />
          {fieldError('endDate')}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border-subtle pt-6 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
