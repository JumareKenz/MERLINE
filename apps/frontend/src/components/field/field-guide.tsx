'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, List, RectangleVertical, SkipForward, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadMarks, markQuestion } from '@/lib/field/question-log';
import type { QuestionMark } from '@/lib/field/types';
import { languageLabel } from '@/lib/languages';
import { cn, formatDuration } from '@/lib/utils';
import type { FieldGuide as Guide } from '@/types/field';

type Question = Guide['questions'][number];

interface Props {
  interviewId: string;
  guide: Guide;
  /** The interview's language, used first when the guide has it. */
  language?: string | null;
  /** The recording running right now, to stamp when each question was asked. */
  live?: () => { recordingId: string; elapsedMs: number } | null;
  readOnly?: boolean;
}

const MODE_KEY = 'merline.field.guideMode';

function t(v: Record<string, string> | undefined, lang: string) {
  return (v && (v[lang] || v.en)) || '';
}

/**
 * The interview guide on the phone. One question at a time (the default,
 * easiest mid-conversation) or the whole list. Marking a question asked
 * notes where the recording is, so the transcript can be matched to the
 * guide later; everything is saved on the phone first and sent when
 * there is a connection.
 */
export function FieldGuide({ interviewId, guide, language, live, readOnly }: Props) {
  const questions = useMemo(() => [...guide.questions].sort((a, b) => a.order - b.order), [guide]);
  const [lang, setLang] = useState(language && guide.languages.includes(language) ? language : 'en');
  const [mode, setMode] = useState<'one' | 'list'>('one');
  const [marks, setMarks] = useState<Record<string, QuestionMark>>({});
  const [index, setIndex] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      if (saved === 'list' || saved === 'one') setMode(saved);
    } catch {
      // Storage blocked: stay on the default.
    }
  }, []);

  useEffect(() => {
    loadMarks(interviewId)
      .then((list) => {
        const map = Object.fromEntries(list.filter((m) => m.status !== 'CLEAR').map((m) => [m.questionId, m]));
        setMarks(map);
        // Resume at the first question not yet dealt with.
        const next = questions.findIndex((q) => !map[q.id]);
        setIndex(next === -1 ? Math.max(0, questions.length - 1) : next);
      })
      .catch(() => undefined);
  }, [interviewId, questions]);

  const done = questions.filter((q) => marks[q.id]).length;

  const mark = async (q: Question, status: 'ASKED' | 'SKIPPED' | 'CLEAR') => {
    const now = live?.() ?? null;
    const entry: QuestionMark = {
      questionId: q.id,
      status,
      markedAt: new Date().toISOString(),
      ...(status === 'ASKED' && now && { atMs: now.elapsedMs, recordingRef: now.recordingId }),
    };
    setMarks((m) => {
      const copy = { ...m };
      if (status === 'CLEAR') delete copy[q.id];
      else copy[q.id] = entry;
      return copy;
    });
    await markQuestion(interviewId, entry).catch(() => undefined);
    if (status !== 'CLEAR' && mode === 'one') {
      const next = questions.findIndex((x, i) => i > questions.indexOf(q) && !marks[x.id] && x.id !== q.id);
      if (next !== -1) setIndex(next);
    }
  };

  const setModeSaved = (m: 'one' | 'list') => {
    setMode(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      // Not remembered; fine.
    }
  };

  const renderQuestion = (q: Question, i: number, big: boolean) => {
    const m = marks[q.id];
    return (
      <div className={cn('space-y-3', !big && 'py-1')}>
        {q.section && (i === 0 || questions[i - 1]?.section !== q.section || big) && (
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-foreground-tertiary">{q.section}</p>
        )}
        <p className={cn('font-medium leading-snug text-foreground', big ? 'text-[21px]' : 'text-[16px]')}>
          <span className="mr-2 tabular-nums text-foreground-tertiary">{i + 1}.</span>
          {t(q.text, lang)}
          {q.required && <span className="ml-1.5 align-middle text-[12px] font-semibold text-error" aria-label="required">*</span>}
        </p>
        {(q.type === 'SINGLE' || q.type === 'MULTIPLE') && q.options.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label={q.type === 'SINGLE' ? 'Possible answers (one)' : 'Possible answers (several)'}>
            {q.options.map((o, j) => (
              <li key={j} className="rounded-full bg-field-card px-3 py-1 text-[14px] text-foreground-secondary ring-1 ring-field-line">
                {t(o, lang)}
              </li>
            ))}
          </ul>
        )}
        {q.type === 'SCALE' && (
          <p className="text-[14px] text-foreground-secondary">
            Scale {q.scaleMin ?? 1} to {q.scaleMax ?? 5}
          </p>
        )}
        {t(q.probes, lang) && (
          <details className="rounded-xl bg-lemon-50 px-3.5 py-2.5 text-[15px] text-foreground dark:bg-lemon-900/20" open={big}>
            <summary className="cursor-pointer text-[13px] font-semibold uppercase tracking-[0.06em] text-lemon-800 dark:text-lemon-300">Probe</summary>
            <p className="mt-1.5">{t(q.probes, lang)}</p>
          </details>
        )}
        {m ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn('inline-flex items-center gap-1.5 text-[15px] font-semibold', m.status === 'ASKED' ? 'text-success' : 'text-foreground-secondary')}>
              {m.status === 'ASKED' ? <Check className="h-4 w-4" aria-hidden /> : <SkipForward className="h-4 w-4" aria-hidden />}
              {m.status === 'ASKED' ? `Asked${m.atMs != null ? ` at ${formatDuration(m.atMs)}` : ''}` : 'Skipped'}
            </span>
            {!readOnly && (
              <button type="button" onClick={() => mark(q, 'CLEAR')} className="inline-flex h-10 items-center gap-1 rounded-lg px-2 text-[14px] text-foreground-secondary">
                <Undo2 className="h-4 w-4" aria-hidden /> Undo
              </button>
            )}
          </div>
        ) : (
          !readOnly && (
            <div className={cn('grid gap-2', big ? 'grid-cols-[1fr_auto]' : 'grid-cols-[1fr_auto]')}>
              <Button size={big ? 'lg' : 'default'} onClick={() => mark(q, 'ASKED')}>
                <Check className="h-5 w-5" aria-hidden /> Asked
              </Button>
              <Button size={big ? 'lg' : 'default'} variant="secondary" onClick={() => mark(q, 'SKIPPED')}>
                Skip
              </Button>
            </div>
          )
        )}
      </div>
    );
  };

  const current = questions[index];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[15px] font-semibold text-foreground">{guide.title}</p>
          <p className="text-[13px] text-foreground-tertiary">
            {done} of {questions.length} done · version {guide.version}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {guide.languages.length > 1 && (
            <div role="group" aria-label="Question language" className="flex rounded-lg bg-field-card p-0.5 ring-1 ring-field-line">
              {guide.languages.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={lang === l}
                  onClick={() => setLang(l)}
                  className={cn('h-9 rounded-md px-2.5 text-[13px] font-semibold', lang === l ? 'bg-navy text-white' : 'text-foreground-secondary')}
                >
                  {languageLabel(l)}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setModeSaved(mode === 'one' ? 'list' : 'one')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-field-card text-foreground-secondary ring-1 ring-field-line"
            aria-label={mode === 'one' ? 'Show all questions' : 'Show one question at a time'}
          >
            {mode === 'one' ? <List className="h-5 w-5" aria-hidden /> : <RectangleVertical className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-field-line" aria-hidden>
        <div className="h-full rounded-full bg-lemon-600 transition-[width]" style={{ width: `${questions.length ? (done / questions.length) * 100 : 0}%` }} />
      </div>

      {mode === 'one' && current ? (
        <div className="rounded-2xl bg-field-card p-5 ring-1 ring-field-line" aria-live="polite">
          {renderQuestion(current, index, true)}
          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              className="inline-flex h-11 items-center gap-1 rounded-lg px-2 text-[15px] font-medium text-foreground-secondary disabled:opacity-40"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden /> Previous
            </button>
            <span className="text-[14px] tabular-nums text-foreground-tertiary">
              {index + 1} / {questions.length}
            </span>
            <button
              type="button"
              disabled={index >= questions.length - 1}
              onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
              className="inline-flex h-11 items-center gap-1 rounded-lg px-2 text-[15px] font-medium text-foreground-secondary disabled:opacity-40"
            >
              Next <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <ol className="divide-y divide-field-line overflow-hidden rounded-2xl bg-field-card px-4 ring-1 ring-field-line">
          {questions.map((q, i) => (
            <li key={q.id} className="py-4">
              {renderQuestion(q, i, false)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
