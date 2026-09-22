'use client';

import { useState, createContext, useContext } from 'react';
import { Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/status-badge';
import { ErrorBoundary } from '@/components/shared/error-boundary';
import { WorkflowNav, computeSteps } from './workflow-nav';
import { AiCopilot } from './ai-copilot';
import { cn } from '@/lib/utils';
import { useStudyDesign } from '@/hooks/use-study-design';
import type { Study } from '@/types/study';

interface WorkspaceContextValue {
  study: Study;
  design: ReturnType<typeof useStudyDesign>['design'];
  setDesign: ReturnType<typeof useStudyDesign>['setDesign'];
  saveStatus: ReturnType<typeof useStudyDesign>['saveStatus'];
  markStepComplete: ReturnType<typeof useStudyDesign>['markStepComplete'];
  currentStep: string;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceShell');
  return ctx;
}

interface WorkspaceShellProps {
  study: Study;
  currentStep: string;
  children: React.ReactNode;
}

export function WorkspaceShell({ study, currentStep, children }: WorkspaceShellProps) {
  const { design, setDesign, saveStatus, markStepComplete } = useStudyDesign(study);
  const [copilotOpen, setCopilotOpen] = useState(true);

  const steps = computeSteps(study.id, design, study);

  return (
    <WorkspaceContext.Provider value={{ study, design, setDesign, saveStatus, markStepComplete, currentStep }}>
      <div className="flex flex-col h-[calc(100vh-48px)]">
        {/* Workspace header */}
        <div className="h-11 flex items-center gap-3 px-4 border-b border-border bg-background shrink-0">
          <Link
            href={`/studies/${study.id}`}
            className="flex items-center gap-1.5 text-[12px] text-foreground-tertiary hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Study
          </Link>
          <span className="text-foreground-tertiary">/</span>
          <span className="text-[13px] font-medium truncate max-w-[280px]">{study.title}</span>
          <StatusBadge status={study.status} />

          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant={copilotOpen ? 'default' : 'outline'}
              className="h-7 px-2.5 text-[12px] gap-1.5"
              onClick={() => setCopilotOpen(!copilotOpen)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {copilotOpen ? 'Hide Copilot' : 'AI Copilot'}
            </Button>
          </div>
        </div>

        {/* Main 3-panel layout */}
        <div className="flex flex-1 min-h-0">
          {/* Left: workflow steps */}
          <WorkflowNav steps={steps} saveStatus={saveStatus} />

          {/* Center: step content */}
          <div className="flex-1 overflow-y-auto">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>

          {/* Right: AI Copilot — always mounted, width-animated for smooth open/close */}
          <div
            className={cn(
              'shrink-0 overflow-hidden border-l border-border transition-all duration-300 ease-standard',
              copilotOpen ? 'w-[300px]' : 'w-0 opacity-0 border-transparent',
            )}
          >
            <div className="w-[300px] h-full">
              <AiCopilot
                studyTitle={study.title}
                studyType={study.study_type ?? study.type}
                currentStep={currentStep}
                context={{
                  projectId: study.project_id,
                  researchQuestions: design.researchQuestions,
                  objectives: design.objectives.map((o) => o.text),
                  studyType: study.study_type ?? study.type,
                  population: design.population.description,
                }}
                onClose={() => setCopilotOpen(false)}
              />
            </div>
          </div>
        </div>
      </div>
    </WorkspaceContext.Provider>
  );
}
