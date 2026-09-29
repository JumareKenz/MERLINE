'use client';

import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { languageLabel } from '@/lib/languages';
import type { GuideQuestionInput } from '@/types/guide';

interface Props {
  index: number;
  total: number;
  question: GuideQuestionInput;
  /** Shown read-only: this stored question once had choices or a scale (now asked as open). */
  wasChoice?: boolean;
  languages: string[];
  readOnly: boolean;
  onChange: (q: GuideQuestionInput) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}

/**
 * One question: its text and probing notes per language, an optional
 * section and whether it is required. Every question is open-ended and is
 * answered out loud, so there is no question type, no options and no scale.
 */
export function QuestionCard({ index, total, question: q, wasChoice, languages, readOnly, onChange, onMove, onRemove }: Props) {
  const id = `q${index}`;
  const set = (patch: Partial<GuideQuestionInput>) => onChange({ ...q, ...patch });

  return (
    <li className="rounded-xl border border-border-subtle bg-background-elevated p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded bg-lemon-500 px-1.5 py-0.5 text-[12px] font-semibold tabular-nums text-lemon-foreground">{index + 1}</span>
        {readOnly ? (
          <span className="text-[13px] text-foreground-tertiary">
            Open question
            {wasChoice ? ' (was multiple choice; now asked as an open question)' : ''}
            {q.required ? ' · required' : ''}
            {q.section ? ` · ${q.section}` : ''}
          </span>
        ) : (
          <>
            <Input
              aria-label={`Question ${index + 1} section`}
              placeholder="Section (optional)"
              value={q.section ?? ''}
              onChange={(e) => set({ section: e.target.value })}
              className="h-9 w-44 text-[13px]"
            />
            <label className="inline-flex items-center gap-1.5 text-[13px] text-foreground-secondary">
              <input type="checkbox" checked={q.required} onChange={(e) => set({ required: e.target.checked })} className="h-4 w-4 accent-[hsl(var(--brand-navy))]" />
              Required
            </label>
            <span className="ml-auto flex gap-1">
              <Button size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move question ${index + 1} up`}>
                <ArrowUp className="h-4 w-4" aria-hidden />
              </Button>
              <Button size="icon-sm" variant="ghost" disabled={index === total - 1} onClick={() => onMove(1)} aria-label={`Move question ${index + 1} down`}>
                <ArrowDown className="h-4 w-4" aria-hidden />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={onRemove} aria-label={`Remove question ${index + 1}`}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </span>
          </>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {languages.map((lang) => (
          <div key={lang} className="space-y-2">
            {readOnly ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">{languageLabel(lang)}</p>
                <p className="text-[15px] leading-relaxed text-foreground">{q.text[lang] || <span className="text-foreground-tertiary">No translation</span>}</p>
                {q.probes[lang] && <p className="text-[13.5px] text-foreground-secondary">Probe: {q.probes[lang]}</p>}
              </>
            ) : (
              <>
                <label htmlFor={`${id}-${lang}`} className="block text-[12px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">
                  {languageLabel(lang)}
                  {lang === 'en' ? ' (required)' : ''}
                </label>
                <Textarea
                  id={`${id}-${lang}`}
                  rows={2}
                  value={q.text[lang] ?? ''}
                  onChange={(e) => set({ text: { ...q.text, [lang]: e.target.value } })}
                  placeholder={lang === 'en' ? 'The question as the interviewer asks it' : 'Translation'}
                />
                <Input
                  aria-label={`Probing notes, ${languageLabel(lang)}`}
                  placeholder="Probing notes for the interviewer (optional)"
                  value={q.probes[lang] ?? ''}
                  onChange={(e) => set({ probes: { ...q.probes, [lang]: e.target.value } })}
                  className="text-[13.5px]"
                />
              </>
            )}
          </div>
        ))}
      </div>

    </li>
  );
}
