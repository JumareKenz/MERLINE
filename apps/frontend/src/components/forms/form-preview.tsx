'use client';

import { useState } from 'react';
import { Smartphone, Tablet, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Section, Question } from '@/types/questionnaire';

type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface FormPreviewProps {
  title: string;
  sections: Section[];
  questions: Question[];
}

export function FormPreview({ title, sections, questions }: FormPreviewProps) {
  const [device, setDevice] = useState<DeviceType>('mobile');

  const deviceWidths: Record<DeviceType, string> = {
    mobile: 'max-w-[375px]',
    tablet: 'max-w-[768px]',
    desktop: 'max-w-full',
  };

  const sortedSections = [...sections].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center gap-2 p-3 border-b border-border bg-background-surface">
        <Button variant={device === 'mobile' ? 'default' : 'ghost'} size="sm" onClick={() => setDevice('mobile')}>
          <Smartphone className="h-4 w-4 mr-1" /> Mobile
        </Button>
        <Button variant={device === 'tablet' ? 'default' : 'ghost'} size="sm" onClick={() => setDevice('tablet')}>
          <Tablet className="h-4 w-4 mr-1" /> Tablet
        </Button>
        <Button variant={device === 'desktop' ? 'default' : 'ghost'} size="sm" onClick={() => setDevice('desktop')}>
          <Monitor className="h-4 w-4 mr-1" /> Desktop
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto bg-neutral-50 p-4 flex justify-center">
        <div className={cn('w-full bg-white rounded-lg shadow-1 p-6 min-h-[600px]', deviceWidths[device])}>
          <h2 className="text-lg font-semibold mb-6">{title}</h2>

          {sortedSections.length === 0 && (
            <div className="flex items-center justify-center h-48 text-sm text-foreground-secondary">
              No questions yet. Add questions to preview the form.
            </div>
          )}

          {sortedSections.map((section) => {
            const sectionQuestions = questions
              .filter((q) => q.section_id === section.id)
              .sort((a, b) => a.order_index - b.order_index);

            return (
              <div key={section.id} className="mb-6">
                <h3 className="font-medium text-base mb-4 pb-2 border-b border-border">{section.title}</h3>
                {sectionQuestions.map((q, i) => (
                  <div key={q.id} className="mb-4">
                    <p className="text-sm mb-2">
                      <span className="text-foreground-secondary mr-1">{i + 1}.</span>
                      {q.label}
                      {q.required && <span className="text-error ml-1">*</span>}
                    </p>
                    {q.help_text && <p className="text-xs text-foreground-secondary mb-1">{q.help_text}</p>}
                    <div className="h-9 rounded-md border border-border bg-background-surface" />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
