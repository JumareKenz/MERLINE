'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ValidationRule } from '@/types/questionnaire';

interface ValidationEditorProps {
  rules: ValidationRule[];
  onAdd: (rule: Partial<ValidationRule>) => void;
  onUpdate: (id: string, data: Partial<ValidationRule>) => void;
  onRemove: (id: string) => void;
}

const RULE_TYPES = [
  { value: 'required', label: 'Required' },
  { value: 'min', label: 'Minimum Value' },
  { value: 'max', label: 'Maximum Value' },
  { value: 'min_length', label: 'Minimum Length' },
  { value: 'max_length', label: 'Maximum Length' },
  { value: 'pattern', label: 'Regex Pattern' },
  { value: 'min_selections', label: 'Min Selections' },
  { value: 'max_selections', label: 'Max Selections' },
];

export function ValidationEditor({ rules, onAdd, onUpdate, onRemove }: ValidationEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Validation Rules</p>
        <Button variant="ghost" size="sm" onClick={() => onAdd({ rule_type: 'required', rule_value: true })}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Rule
        </Button>
      </div>
      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center gap-2 p-2 border border-border rounded-md">
            <Select value={rule.rule_type} onValueChange={(v) => onUpdate(rule.id, { rule_type: v as ValidationRule['rule_type'] })}>
              <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{RULE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
            {rule.rule_type !== 'required' && (
              <Input
                value={String(rule.rule_value || '')}
                onChange={(e) => onUpdate(rule.id, { rule_value: e.target.value })}
                className="h-7 text-xs flex-1"
                placeholder="Value"
              />
            )}
            <Input
              value={rule.error_message || ''}
              onChange={(e) => onUpdate(rule.id, { error_message: e.target.value })}
              className="h-7 text-xs flex-1"
              placeholder="Error message"
            />
            <button onClick={() => onRemove(rule.id)} className="text-foreground-tertiary hover:text-error shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
