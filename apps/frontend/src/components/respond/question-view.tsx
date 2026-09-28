'use client';

import { cn } from '@/lib/utils';
import type { PublicQuestion } from '@/types/respondent-link';

export function localized(text: Record<string, string> | undefined, lang: string): string {
  if (!text) return '';
  return text[lang]?.trim() || text.en?.trim() || Object.values(text).find((v) => v?.trim()) || '';
}

export interface ClosedAnswer {
  selected?: number[];
  value?: number;
}

export function isAnswered(q: PublicQuestion, a?: ClosedAnswer): boolean {
  if (q.type === 'SINGLE' || q.type === 'MULTIPLE') return !!a?.selected?.length;
  if (q.type === 'SCALE') return a?.value !== undefined;
  return true;
}

/** One question, large and calm; closed questions get tap targets. */
export function QuestionView({
  q,
  lang,
  answer,
  onAnswer,
  compact = false,
}: {
  q: PublicQuestion;
  lang: string;
  answer?: ClosedAnswer;
  onAnswer: (a: ClosedAnswer) => void;
  compact?: boolean;
}) {
  const min = q.scaleMin ?? 1;
  const max = q.scaleMax ?? 5;
  return (
    <div>
      {q.section && <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-foreground-tertiary">{localized({ en: q.section }, lang)}</p>}
      <h2 className={cn('font-display font-semibold leading-snug text-foreground', compact ? 'text-[17px]' : 'text-[22px] sm:text-[26px]')}>
        {localized(q.text, lang)}
      </h2>

      {q.type === 'OPEN' && !compact && (
        <p className="mt-3 text-[15px] text-foreground-secondary">Answer out loud, in your own words. Take as long as you need.</p>
      )}

      {(q.type === 'SINGLE' || q.type === 'MULTIPLE') && (
        <fieldset className="mt-4 space-y-2">
          <legend className="sr-only">{q.type === 'SINGLE' ? 'Choose one' : 'Choose all that apply'}</legend>
          <p className="text-[14px] text-foreground-tertiary">{q.type === 'SINGLE' ? 'Choose one.' : 'Choose all that apply.'} You can also explain out loud.</p>
          {q.options.map((opt, i) => {
            const on = !!answer?.selected?.includes(i);
            return (
              <label
                key={i}
                className={cn(
                  'flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[16px] transition-colors',
                  on ? 'border-primary bg-primary-50 text-foreground ring-1 ring-primary' : 'border-border-subtle bg-background-elevated hover:border-border-strong',
                )}
              >
                <input
                  type={q.type === 'SINGLE' ? 'radio' : 'checkbox'}
                  name={`q-${q.id}`}
                  className="h-5 w-5 shrink-0 accent-[hsl(var(--brand-navy))]"
                  checked={on}
                  onChange={() => {
                    if (q.type === 'SINGLE') onAnswer({ selected: [i] });
                    else {
                      const cur = new Set(answer?.selected ?? []);
                      if (cur.has(i)) cur.delete(i);
                      else cur.add(i);
                      onAnswer({ selected: [...cur].sort((a, b) => a - b) });
                    }
                  }}
                />
                <span>{localized(opt, lang)}</span>
              </label>
            );
          })}
        </fieldset>
      )}

      {q.type === 'SCALE' && (
        <fieldset className="mt-4">
          <legend className="mb-2 text-[14px] text-foreground-tertiary">
            Choose from {min} (lowest) to {max} (highest). You can also explain out loud.
          </legend>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: max - min + 1 }, (_, k) => min + k).map((v) => {
              const on = answer?.value === v;
              return (
                <button
                  key={v}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onAnswer({ value: v })}
                  className={cn(
                    'h-12 min-w-12 rounded-xl border px-3 text-[17px] font-semibold tabular-nums transition-colors',
                    on ? 'border-primary bg-primary text-primary-foreground' : 'border-border-subtle bg-background-elevated hover:border-border-strong',
                  )}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
