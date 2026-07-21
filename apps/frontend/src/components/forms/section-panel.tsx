'use client';

import { useState } from 'react';
import { Plus, ChevronDown, ChevronRight, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Section, Question } from '@/types/questionnaire';

interface SectionPanelProps {
  section: Section;
  questions: Question[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateTitle: (title: string) => void;
  onRemove: () => void;
  onAddQuestion: () => void;
  onSelectQuestion: (id: string) => void;
  selectedQuestionId: string | null;
}

export function SectionPanel({
  section,
  questions,
  isExpanded,
  onToggleExpand,
  onUpdateTitle,
  onRemove,
  onAddQuestion,
  onSelectQuestion,
  selectedQuestionId,
}: SectionPanelProps) {
  const sortedQuestions = [...questions].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="border border-border rounded-lg bg-background-elevated mb-4">
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <button onClick={onToggleExpand} className="text-foreground-tertiary hover:text-foreground">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <GripVertical className="h-4 w-4 text-foreground-tertiary cursor-grab shrink-0" />
        <Input
          value={section.title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          className="h-7 text-sm font-medium border-0 bg-transparent focus:bg-background-hover px-1"
        />
        <span className="text-xs text-foreground-secondary shrink-0">{questions.length} questions</span>
        <button onClick={onRemove} className="text-foreground-tertiary hover:text-error ml-auto">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {isExpanded && (
        <div className="p-2 space-y-1">
          {sortedQuestions.map((q) => (
            <button
              key={q.id}
              onClick={() => onSelectQuestion(q.id)}
              className={cn(
                'w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors',
                selectedQuestionId === q.id ? 'bg-primary-50 text-primary' : 'hover:bg-background-hover'
              )}
            >
              <GripVertical className="h-3.5 w-3.5 text-foreground-tertiary cursor-grab shrink-0" />
              <span className="text-xs text-foreground-tertiary shrink-0">{q.code}</span>
              <span className="truncate flex-1">{q.label}</span>
              <span className="text-[10px] text-foreground-secondary capitalize shrink-0">{q.question_type.replace(/_/g, ' ')}</span>
              {q.required && <span className="text-error text-xs shrink-0">*</span>}
            </button>
          ))}
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs mt-2" onClick={onAddQuestion}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Question
          </Button>
        </div>
      )}
    </div>
  );
}
