'use client';

import { useState } from 'react';
import { Plus, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { QuestionOption, CreateOptionDto } from '@/types/questionnaire';

interface OptionEditorProps {
  options: QuestionOption[];
  onAdd: (data: CreateOptionDto) => void;
  onUpdate: (optionId: string, data: Partial<QuestionOption>) => void;
  onRemove: (optionId: string) => void;
}

export function OptionEditor({ options, onAdd, onUpdate, onRemove }: OptionEditorProps) {
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    if (!newLabel.trim()) return;
    onAdd({ text: newLabel.trim(), value: newValue.trim() || newLabel.trim().toLowerCase().replace(/\s+/g, '_') });
    setNewLabel('');
    setNewValue('');
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Options</p>
      <div className="space-y-2">
        {options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-foreground-tertiary cursor-grab shrink-0" />
            <Input
              value={opt.label}
              onChange={(e) => onUpdate(opt.id, { label: e.target.value })}
              className="h-8 text-sm flex-1"
            />
            <Input
              value={opt.value}
              onChange={(e) => onUpdate(opt.id, { value: e.target.value })}
              className="h-8 text-sm w-24"
            />
            {opt.score !== undefined && (
              <span className="text-xs text-foreground-secondary w-8 text-center">{opt.score}</span>
            )}
            <button onClick={() => onRemove(opt.id)} className="text-foreground-tertiary hover:text-error transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          placeholder="Option label"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="h-8 text-sm flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Input
          placeholder="Value"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          className="h-8 text-sm w-24"
        />
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
