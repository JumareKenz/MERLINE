'use client';

import { useFormBuilderStore } from '@/stores/form-builder-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Trash2, GripVertical } from 'lucide-react';

interface CanvasQuestionProps {
  questionId: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function CanvasQuestion({ questionId, isSelected, onSelect, onDuplicate, onDelete }: CanvasQuestionProps) {
  const { questions, updateQuestion } = useFormBuilderStore();
  const question = questions.find((q) => q.id === questionId);
  if (!question) return null;

  return (
    <Card
      className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-border'}`}
      onClick={() => onSelect(questionId)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className="mt-1">
            <GripVertical className="h-4 w-4 text-foreground-tertiary cursor-grab" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Input
                value={question.label}
                onChange={(e) => updateQuestion(questionId, { label: e.target.value })}
                className="h-7 text-sm font-medium border-0 bg-transparent focus:bg-background-hover px-1 flex-1"
                placeholder="Question label"
                onClick={(e) => e.stopPropagation()}
              />
              <Select
                value={question.question_type}
                onValueChange={(v) => updateQuestion(questionId, { question_type: v as typeof question.question_type })}
              >
                <SelectTrigger className="h-7 text-xs w-32" onClick={(e) => e.stopPropagation()}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="textarea">Text Area</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="select_one">Dropdown</SelectItem>
                  <SelectItem value="select_multiple">Multi Select</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="matrix">Matrix</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground-secondary">
              <span className="font-mono">{question.code}</span>
              <span>·</span>
              <label className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(e) => updateQuestion(questionId, { required: e.target.checked })}
                  className="h-3 w-3 rounded border-border"
                />
                Required
              </label>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onDuplicate(questionId); }} className="text-foreground-tertiary hover:text-foreground p-1">
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(questionId); }} className="text-foreground-tertiary hover:text-error p-1">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
