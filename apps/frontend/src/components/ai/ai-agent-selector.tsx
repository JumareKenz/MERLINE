'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AgentId } from '@/types/ai';

const AGENTS: { id: AgentId; label: string; description: string }[] = [
  { id: 'research_design', label: 'Research Design', description: 'ToC, LogFrame, methodology' },
  { id: 'survey_design', label: 'Survey Design', description: 'Questions, skip logic, validation' },
  { id: 'indicator', label: 'Indicator', description: 'SMART validation, suggestions' },
  { id: 'data_quality', label: 'Data Quality', description: 'Anomaly detection, scoring' },
  { id: 'reporting', label: 'Reporting', description: 'Narratives, summaries, recommendations' },
  { id: 'knowledge', label: 'Knowledge', description: 'Q&A, document retrieval' },
  { id: 'qualitative', label: 'Qualitative', description: 'Theme extraction, sentiment' },
  { id: 'executive', label: 'Executive', description: 'Portfolio summaries, trends' },
  { id: 'translation', label: 'Translation', description: 'Multi-language translation' },
];

interface AiAgentSelectorProps {
  value: AgentId;
  onChange: (value: AgentId) => void;
  disabled?: boolean;
}

export function AiAgentSelector({ value, onChange, disabled }: AiAgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = AGENTS.find((a) => a.id === value);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full justify-between"
      >
        <Sparkles className="mr-2 h-4 w-4 text-primary" />
        <span className="flex-1 text-left truncate">{selected?.label || 'Select Agent'}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
            <div className="p-1">
              {AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => {
                    onChange(agent.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent',
                    value === agent.id && 'bg-accent'
                  )}
                >
                  <Check
                    className={cn('mt-0.5 h-4 w-4 shrink-0', value === agent.id ? 'opacity-100' : 'opacity-0')}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{agent.label}</div>
                    <div className="text-xs text-muted-foreground">{agent.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
