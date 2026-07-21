'use client';

import { Type, TextQuote, Hash, Calendar, Clock, ListChecks, ListTodo, CheckSquare, Star, Table2, MapPin, Camera, Mic, FileImage, FileSignature, Barcode, Calculator, StickyNote, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types/questionnaire';

interface QuestionTypeItem {
  type: QuestionType;
  label: string;
  icon: React.ReactNode;
  category: 'basic' | 'choice' | 'media' | 'advanced';
}

const QUESTION_TYPES: QuestionTypeItem[] = [
  { type: 'text', label: 'Text (short)', icon: <Type className="h-4 w-4" />, category: 'basic' },
  { type: 'textarea', label: 'Text (long)', icon: <TextQuote className="h-4 w-4" />, category: 'basic' },
  { type: 'number', label: 'Number', icon: <Hash className="h-4 w-4" />, category: 'basic' },
  { type: 'date', label: 'Date', icon: <Calendar className="h-4 w-4" />, category: 'basic' },
  { type: 'time', label: 'Time', icon: <Clock className="h-4 w-4" />, category: 'basic' },
  { type: 'select_one', label: 'Single Select', icon: <ListChecks className="h-4 w-4" />, category: 'choice' },
  { type: 'select_multiple', label: 'Multiple Select', icon: <ListTodo className="h-4 w-4" />, category: 'choice' },
  { type: 'boolean', label: 'Yes/No', icon: <CheckSquare className="h-4 w-4" />, category: 'choice' },
  { type: 'rating', label: 'Rating', icon: <Star className="h-4 w-4" />, category: 'choice' },
  { type: 'matrix', label: 'Matrix', icon: <Table2 className="h-4 w-4" />, category: 'choice' },
  { type: 'geolocation', label: 'GPS', icon: <MapPin className="h-4 w-4" />, category: 'media' },
  { type: 'photo', label: 'Photo', icon: <Camera className="h-4 w-4" />, category: 'media' },
  { type: 'audio', label: 'Audio', icon: <Mic className="h-4 w-4" />, category: 'media' },
  { type: 'file', label: 'File', icon: <FileImage className="h-4 w-4" />, category: 'media' },
  { type: 'signature', label: 'Signature', icon: <FileSignature className="h-4 w-4" />, category: 'media' },
  { type: 'barcode', label: 'Barcode', icon: <Barcode className="h-4 w-4" />, category: 'media' },
  { type: 'calculated', label: 'Calculated', icon: <Calculator className="h-4 w-4" />, category: 'advanced' },
  { type: 'note', label: 'Note', icon: <StickyNote className="h-4 w-4" />, category: 'advanced' },
];

const CATEGORIES = [
  { key: 'basic', label: 'Basic Inputs' },
  { key: 'choice', label: 'Choice' },
  { key: 'media', label: 'Media & Location' },
  { key: 'advanced', label: 'Advanced' },
] as const;

interface QuestionTypeSelectorProps {
  onSelect: (type: QuestionType) => void;
  onClose?: () => void;
}

export function QuestionTypeSelector({ onSelect, onClose }: QuestionTypeSelectorProps) {
  return (
    <div className="space-y-4">
      {CATEGORIES.map((cat) => {
        const items = QUESTION_TYPES.filter((q) => q.category === cat.key);
        return (
          <div key={cat.key}>
            <p className="text-xs font-semibold text-foreground-secondary uppercase tracking-wider mb-2">{cat.label}</p>
            <div className="grid grid-cols-2 gap-1">
              {items.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => onSelect(item.type)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-background-hover transition-colors text-left"
                >
                  <span className="text-foreground-secondary">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
