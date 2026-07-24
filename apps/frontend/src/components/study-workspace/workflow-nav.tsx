'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudyDesignData } from '@/hooks/use-study-design';
import type { Study } from '@/types/study';

export interface WorkflowStep {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  complete: boolean;
  warning?: boolean;
}

export function computeSteps(studyId: string, design: StudyDesignData, study: Study): WorkflowStep[] {
  const base = `/studies/${studyId}/design`;
  return [
    {
      id: 'overview',
      label: 'Overview',
      sublabel: 'Study basics',
      href: `${base}/overview`,
      complete: !!study.title,
    },
    {
      id: 'research',
      label: 'Research Design',
      sublabel: 'Questions & objectives',
      href: `${base}/research`,
      complete: design.researchQuestions.length > 0 && design.objectives.length > 0,
    },
    {
      id: 'methodology',
      label: 'Methodology',
      sublabel: 'Method, sample & population',
      href: `${base}/methodology`,
      complete: !!(study.study_type || study.type) && design.population.description.length > 0,
    },
    {
      id: 'toc',
      label: 'Theory of Change',
      sublabel: 'Causal pathway',
      href: `${base}/toc`,
      complete: design.completedSteps?.toc ?? false,
    },
    {
      id: 'logframe',
      label: 'Logframe',
      sublabel: 'Logical framework',
      href: `${base}/logframe`,
      complete: design.completedSteps?.logframe ?? false,
    },
    {
      id: 'indicators',
      label: 'Indicators',
      sublabel: `${study.indicator_count ?? study._count?.indicators ?? 0} linked`,
      href: `${base}/indicators`,
      complete: (study.indicator_count ?? study._count?.indicators ?? 0) > 0,
    },
    {
      id: 'instruments',
      label: 'Instruments',
      sublabel: `${study.questionnaire_count ?? study._count?.questionnaires ?? 0} questionnaire${(study.questionnaire_count ?? 0) !== 1 ? 's' : ''}`,
      href: `${base}/instruments`,
      complete: (study.questionnaire_count ?? study._count?.questionnaires ?? 0) > 0,
    },
    {
      id: 'review',
      label: 'Review & Approve',
      sublabel: (['APPROVED', 'approved'] as string[]).includes(study.status) ? 'Approved ✓' : 'Pending review',
      href: `${base}/review`,
      complete: (['APPROVED', 'DATA_COLLECTION', 'approved', 'data_collection'] as string[]).includes(study.status),
    },
  ];
}

interface WorkflowNavProps {
  steps: WorkflowStep[];
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

export function WorkflowNav({ steps, saveStatus }: WorkflowNavProps) {
  const pathname = usePathname();

  return (
    <div className="w-[220px] shrink-0 border-r border-border bg-background-subtle h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-foreground-tertiary">
          Conceptualize
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          {saveStatus === 'saving' && (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
              <span className="text-[11px] text-foreground-tertiary">Saving…</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <Check className="h-3 w-3 text-success" />
              <span className="text-[11px] text-success">Saved</span>
            </>
          )}
          {saveStatus === 'error' && (
            <>
              <AlertCircle className="h-3 w-3 text-error" />
              <span className="text-[11px] text-error">Save failed</span>
            </>
          )}
          {saveStatus === 'idle' && (
            <span className="text-[11px] text-foreground-tertiary">Autosave on</span>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {steps.map((step, i) => {
          const isActive = pathname === step.href || pathname.startsWith(step.href + '/');
          return (
            <Link
              key={step.id}
              href={step.href}
              className={cn(
                'flex items-start gap-3 px-4 py-2.5 transition-colors group relative',
                isActive
                  ? 'bg-primary/5 text-primary'
                  : 'text-foreground-secondary hover:bg-background-hover hover:text-foreground',
              )}
            >
              {isActive && (
                <span className="absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-primary" />
              )}

              {/* Step indicator */}
              <div className="shrink-0 mt-0.5">
                {step.complete ? (
                  <div className="h-5 w-5 rounded-full bg-success/15 flex items-center justify-center">
                    <Check className="h-3 w-3 text-success" />
                  </div>
                ) : isActive ? (
                  <div className="h-5 w-5 rounded-full border-2 border-primary flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-primary">{i + 1}</span>
                  </div>
                ) : (
                  <div className="h-5 w-5 rounded-full border border-border/70 flex items-center justify-center">
                    <span className="text-[10px] text-foreground-tertiary">{i + 1}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-[13px] font-medium leading-tight',
                  isActive ? 'text-primary' : '',
                )}>
                  {step.label}
                </p>
                {step.sublabel && (
                  <p className="text-[11px] text-foreground-tertiary mt-0.5 truncate">{step.sublabel}</p>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Progress summary */}
      <div className="p-4 border-t border-border">
        {(() => {
          const done = steps.filter((s) => s.complete).length;
          const total = steps.length;
          const pct = Math.round((done / total) * 100);
          return (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-foreground-tertiary">Progress</span>
                <span className="text-[11px] font-semibold">{done}/{total}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
