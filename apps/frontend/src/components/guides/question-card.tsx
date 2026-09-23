'use client';

import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { languageLabel } from '@/lib/languages';
import { QUESTION_TYPES, type GuideQuestion, type QuestionType } from '@/types/guide';

interface Props {
  index: number;
  total: number;
  question: GuideQuestion;
  languages: string[];
  readOnly: boolean;
  onChange: (q: GuideQuestion) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}

/** One question: its text and probes per language, type, options, scale and required flag. */
export function QuestionCard({ index, total, question: q, languages, readOnly, onChange, onMove, onRemove }: Props) {
  const id = `q${index}`;
  const set = (patch: Partial<GuideQuestion>) => onChange({ ...q, ...patch });
  const choice = q.type === 'SINGLE' || q.type === 'MULTIPLE';

  return (
    <li className="rounded-xl border border-border-subtle bg-background-elevated p-4 shadow-soft sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded bg-lemon-500 px-1.5 py-0.5 text-[12px] font-semibold tabular-nums text-lemon-foreground">{index + 1}</span>
        {readOnly ? (
          <span className="text-[13px] text-foreground-tertiary">
            {QUESTION_TYPES.find((t) => t.value === q.type)?.label}
            {q.required ? ' · required' : ''}
            {q.section ? ` · ${q.section}` : ''}
          </span>
        ) : (
          <>
            <label className="sr-only" htmlFor={`${id}-type`}>
              Question {index + 1} type
            </label>
            <NativeSelect
              id={`${id}-type`}
              value={q.type}
              onChange={(e) => {
                const type = e.target.value as QuestionType;
                set({
                  type,
                  options: type === 'SINGLE' || type === 'MULTIPLE' ? (q.options.length ? q.options : [{ en: '' }, { en: '' }]) : [],
                  scaleMin: type === 'SCALE' ? (q.scaleMin ?? 1) : null,
                  scaleMax: type === 'SCALE' ? (q.scaleMax ?? 5) : null,
                });
              }}
              className="h-9 w-auto text-[13px]"
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
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

      {choice && (
        <div className="mt-4">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">Options</p>
          <ol className="space-y-2">
            {q.options.map((opt, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <span className="w-5 text-right text-[12px] tabular-nums text-foreground-tertiary">{i + 1}.</span>
                {languages.map((lang) =>
                  readOnly ? (
                    <span key={lang} className="text-[14px] text-foreground">
                      {opt[lang] || '—'}
                      {lang !== languages.at(-1) && <span className="mx-2 text-foreground-tertiary">/</span>}
                    </span>
                  ) : (
                    <Input
                      key={lang}
                      aria-label={`Option ${i + 1}, ${languageLabel(lang)}`}
                      placeholder={languageLabel(lang) ?? lang}
                      value={opt[lang] ?? ''}
                      onChange={(e) => set({ options: q.options.map((o, j) => (j === i ? { ...o, [lang]: e.target.value } : o)) })}
                      className="h-9 min-w-[140px] flex-1 text-[13.5px]"
                    />
                  ),
                )}
                {!readOnly && (
                  <Button size="icon-sm" variant="ghost" onClick={() => set({ options: q.options.filter((_, j) => j !== i) })} aria-label={`Remove option ${i + 1}`}>
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ol>
          {!readOnly && (
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => set({ options: [...q.options, { en: '' }] })}>
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add option
            </Button>
          )}
        </div>
      )}

      {q.type === 'SCALE' && (
        <div className="mt-4 flex items-center gap-2 text-[13.5px] text-foreground-secondary">
          Scale from
          {readOnly ? (
            <strong className="text-foreground">{q.scaleMin ?? 1}</strong>
          ) : (
            <Input type="number" aria-label="Scale minimum" value={q.scaleMin ?? 1} onChange={(e) => set({ scaleMin: Number(e.target.value) })} className="h-9 w-20" />
          )}
          to
          {readOnly ? (
            <strong className="text-foreground">{q.scaleMax ?? 5}</strong>
          ) : (
            <Input type="number" aria-label="Scale maximum" value={q.scaleMax ?? 5} onChange={(e) => set({ scaleMax: Number(e.target.value) })} className="h-9 w-20" />
          )}
        </div>
      )}
    </li>
  );
}
