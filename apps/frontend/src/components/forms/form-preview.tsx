'use client';

import { useState } from 'react';
import { Smartphone, Tablet, Monitor, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Section, Question, QuestionOption } from '@/types/questionnaire';

type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface FormPreviewProps {
  title: string;
  sections: Section[];
  questions: Question[];
}

const DEVICE_WIDTHS: Record<DeviceType, string> = {
  mobile: 'max-w-[390px]',
  tablet: 'max-w-[768px]',
  desktop: 'max-w-full',
};

function QuestionField({ question }: { question: Question }) {
  const [value, setValue] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const options: QuestionOption[] = question.options ?? [];
  const base = 'w-full rounded-md border border-border bg-background px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30';

  switch (question.question_type) {
    case 'text':
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={question.placeholder || 'Type your answer…'}
          className={base}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0"
          className={cn(base, 'w-40')}
        />
      );

    case 'textarea':
      return (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={question.placeholder || 'Type your answer…'}
          rows={3}
          className={cn(base, 'resize-none')}
        />
      );

    case 'select_one':
      return (
        <div className="space-y-2">
          {options.length === 0 ? (
            <p className="text-[12px] text-foreground-tertiary italic">No options defined</p>
          ) : options.map((opt) => (
            <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer">
              <input type="radio" name={question.id} value={opt.value} className="h-4 w-4 accent-primary" />
              <span className="text-[13px]">{opt.label}</span>
            </label>
          ))}
        </div>
      );

    case 'select_multiple':
      return (
        <div className="space-y-2">
          {options.length === 0 ? (
            <p className="text-[12px] text-foreground-tertiary italic">No options defined</p>
          ) : options.map((opt) => (
            <label key={opt.id} className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" value={opt.value} className="h-4 w-4 accent-primary" />
              <span className="text-[13px]">{opt.label}</span>
            </label>
          ))}
        </div>
      );

    case 'rating': {
      const maxRule = question.validation_rules?.find((r) => r.rule_type === 'max');
      const scale = maxRule ? Number(maxRule.rule_value) : 5;
      const labels = options.length > 0
        ? options.map((o) => o.label)
        : Array.from({ length: scale }, (_, i) => String(i + 1));
      return (
        <div className="flex gap-2 flex-wrap">
          {labels.map((label, i) => (
            <button
              key={i}
              onClick={() => setRating(i + 1)}
              className={cn(
                'min-w-[40px] h-9 rounded-md border text-[13px] font-medium px-3 transition-colors',
                rating === i + 1
                  ? 'border-primary bg-primary text-white'
                  : 'border-border hover:border-primary hover:bg-primary/5'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      );
    }

    case 'matrix':
      return (
        <div className={cn(base, 'text-foreground-tertiary text-[13px]')}>
          Grid/matrix question
        </div>
      );

    case 'date':
      return <input type="date" className={cn(base, 'w-48')} />;

    case 'time':
      return <input type="time" className={cn(base, 'w-36')} />;

    case 'boolean':
      return (
        <div className="flex gap-3">
          {['Yes', 'No'].map((label) => (
            <button
              key={label}
              onClick={() => setValue(label)}
              className={cn(
                'px-5 py-1.5 rounded-md border text-[13px] font-medium transition-colors',
                value === label
                  ? 'border-primary bg-primary text-white'
                  : 'border-border hover:border-primary hover:bg-primary/5'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      );

    case 'geolocation':
      return (
        <div className={cn(base, 'flex items-center gap-2 text-foreground-tertiary cursor-not-allowed')}>
          📍 GPS location captured automatically
        </div>
      );

    case 'photo':
      return (
        <div className={cn(base, 'flex items-center justify-center h-20 text-foreground-tertiary text-[13px] cursor-pointer hover:bg-background-hover transition-colors')}>
          📷 Tap to take photo
        </div>
      );

    case 'file':
      return (
        <div className={cn(base, 'flex items-center justify-center h-20 text-foreground-tertiary text-[13px] cursor-pointer hover:bg-background-hover transition-colors')}>
          📎 Tap to attach file
        </div>
      );

    case 'audio':
      return (
        <div className={cn(base, 'flex items-center gap-2 text-foreground-tertiary text-[13px]')}>
          🎙️ Record audio response
        </div>
      );

    case 'signature':
      return (
        <div className={cn(base, 'h-20 flex items-center justify-center text-foreground-tertiary text-[13px]')}>
          ✍️ Signature pad
        </div>
      );

    case 'barcode':
      return (
        <div className={cn(base, 'flex items-center gap-2 text-foreground-tertiary text-[13px]')}>
          📷 Scan barcode
        </div>
      );

    case 'note':
    case 'calculated':
    case 'cadence':
      return null;

    default:
      return <input type="text" placeholder="Answer…" className={base} />;
  }
}

export function FormPreview({ title, sections, questions }: FormPreviewProps) {
  const [device, setDevice] = useState<DeviceType>('mobile');
  const [currentSection, setCurrentSection] = useState(0);

  const sortedSections = [...sections].sort((a, b) => a.order_index - b.order_index);
  const totalSections = sortedSections.length;
  const section = sortedSections[currentSection];
  const totalQuestions = questions.length;

  const sectionQuestions = section
    ? questions
        .filter((q) => q.section_id === section.id)
        .sort((a, b) => a.order_index - b.order_index)
    : [];

  const prevQCount = sortedSections
    .slice(0, currentSection)
    .reduce((s, sec) => s + questions.filter((q) => q.section_id === sec.id).length, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background-subtle">
        <span className="text-[12px] text-foreground-tertiary">
          {totalQuestions} question{totalQuestions !== 1 ? 's' : ''} · {totalSections} section{totalSections !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-1">
          {(['mobile', 'tablet', 'desktop'] as DeviceType[]).map((type) => {
            const icons = { mobile: <Smartphone className="h-3.5 w-3.5" />, tablet: <Tablet className="h-3.5 w-3.5" />, desktop: <Monitor className="h-3.5 w-3.5" /> };
            return (
              <button
                key={type}
                onClick={() => setDevice(type)}
                className={cn(
                  'flex items-center gap-1 px-2 h-7 rounded text-[12px] transition-colors capitalize',
                  device === type
                    ? 'bg-primary text-white'
                    : 'text-foreground-tertiary hover:text-foreground hover:bg-background-hover'
                )}
              >
                {icons[type]} {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-y-auto bg-neutral-100 dark:bg-neutral-900 p-6 flex justify-center">
        <div className={cn('w-full transition-all duration-300', DEVICE_WIDTHS[device])}>
          <div className="rounded-xl bg-white dark:bg-neutral-950 shadow-md overflow-hidden">
            {/* Header */}
            <div className="bg-primary px-6 py-5">
              <h2 className="text-[15px] font-semibold text-white">{title}</h2>
              {totalSections > 0 && (
                <p className="text-[12px] text-white/70 mt-0.5">
                  Section {currentSection + 1} of {totalSections}
                </p>
              )}
            </div>

            {/* Progress */}
            {totalSections > 1 && (
              <div className="h-1.5 bg-neutral-200 dark:bg-neutral-800">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((currentSection + 1) / totalSections) * 100}%` }}
                />
              </div>
            )}

            <div className="p-6">
              {sortedSections.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-[13px] text-foreground-tertiary">
                  Add questions in the form builder to preview the form.
                </div>
              ) : section ? (
                <>
                  <h3 className="text-[14px] font-semibold mb-1">{section.title}</h3>
                  {section.description && (
                    <p className="text-[12px] text-foreground-secondary mb-4">{section.description}</p>
                  )}
                  <div className="space-y-5 mt-4">
                    {sectionQuestions.map((q, i) => (
                      <div key={q.id}>
                        <label className="block text-[13px] font-medium mb-1.5 leading-snug">
                          <span className="text-foreground-tertiary mr-1.5">{prevQCount + i + 1}.</span>
                          {q.label}
                          {q.required && <span className="text-error ml-0.5">*</span>}
                        </label>
                        {q.help_text && (
                          <p className="text-[11px] text-foreground-tertiary mb-1.5">{q.help_text}</p>
                        )}
                        <QuestionField question={q} />
                      </div>
                    ))}
                    {sectionQuestions.length === 0 && (
                      <p className="text-[13px] text-foreground-tertiary text-center py-8">
                        No questions in this section.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-[13px]"
                      disabled={currentSection === 0}
                      onClick={() => setCurrentSection((s) => s - 1)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                    </Button>
                    {currentSection < totalSections - 1 ? (
                      <Button
                        size="sm"
                        className="h-8 text-[13px]"
                        onClick={() => setCurrentSection((s) => s + 1)}
                      >
                        Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    ) : (
                      <Button size="sm" className="h-8 text-[13px]">Submit</Button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
