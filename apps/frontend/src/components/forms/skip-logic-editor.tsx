'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { SkipLogic } from '@/types/questionnaire';

interface SkipLogicEditorProps {
  rules: SkipLogic[];
  questions: { id: string; label: string }[];
  onAdd: () => void;
  onUpdate: (id: string, data: Partial<SkipLogic>) => void;
  onRemove: (id: string) => void;
}

export function SkipLogicEditor({ rules, questions, onAdd, onUpdate, onRemove }: SkipLogicEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Skip Logic Rules</p>
        <Button variant="ghost" size="sm" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Rule
        </Button>
      </div>
      {rules.length === 0 && (
        <p className="text-xs text-foreground-secondary">No skip logic rules defined. Questions will always be shown.</p>
      )}
      <div className="space-y-3">
        {rules.map((rule) => (
          <div key={rule.id} className="p-3 border border-border rounded-md bg-background-surface space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-secondary">When</span>
              <Select value={rule.condition_type} onValueChange={(v) => onUpdate(rule.id, { condition_type: v as SkipLogic['condition_type'] })}>
                <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">equals</SelectItem>
                  <SelectItem value="not_equals">not equals</SelectItem>
                  <SelectItem value="greater_than">&gt;</SelectItem>
                  <SelectItem value="less_than">&lt;</SelectItem>
                  <SelectItem value="in">in</SelectItem>
                  <SelectItem value="not_in">not in</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={String(rule.condition_value || '')}
                onChange={(e) => onUpdate(rule.id, { condition_value: e.target.value })}
                className="h-7 text-xs flex-1"
                placeholder="Value"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-secondary">Then</span>
              <Select value={rule.action} onValueChange={(v) => onUpdate(rule.id, { action: v as SkipLogic['action'] })}>
                <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="show">Show</SelectItem>
                  <SelectItem value="hide">Hide</SelectItem>
                  <SelectItem value="skip_to">Skip to</SelectItem>
                </SelectContent>
              </Select>
              <Select value={rule.target_question_id} onValueChange={(v) => onUpdate(rule.id, { target_question_id: v })}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Select question" /></SelectTrigger>
                <SelectContent>
                  {questions.map((q) => <SelectItem key={q.id} value={q.id}>{q.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <button onClick={() => onRemove(rule.id)} className="text-foreground-tertiary hover:text-error shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
