'use client';

import { Undo2, Redo2, Eye, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormBuilderStore } from '@/stores/form-builder-store';

interface FormBuilderToolbarProps {
  title: string;
  onTitleChange?: (title: string) => void;
  onSave?: () => void;
  onPreview?: () => void;
  onPublish?: () => void;
  isSaving?: boolean;
}

export function FormBuilderToolbar({ title, onTitleChange, onSave, onPreview, onPublish, isSaving }: FormBuilderToolbarProps) {
  const { undo, redo, undoStack, redoStack, saveStatus, lastSavedAt } = useFormBuilderStore();

  return (
    <div className="flex items-center justify-between h-14 px-4 border-b border-border bg-background-elevated">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange?.(e.target.value)}
          className="text-base font-semibold bg-transparent border-none outline-none focus:ring-0 w-64"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={undo} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={redo} disabled={redoStack.length === 0} title="Redo (Ctrl+Shift+Z)">
          <Redo2 className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-2" />

        <span className={`text-xs ${saveStatus === 'saved' ? 'text-success' : saveStatus === 'saving' ? 'text-warning' : saveStatus === 'unsaved' ? 'text-warning' : 'text-error'}`}>
          {saveStatus === 'saved' && lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}` : saveStatus === 'saving' ? 'Saving...' : saveStatus === 'unsaved' ? 'Unsaved' : 'Error'}
        </span>

        <Button variant="secondary" size="sm" onClick={onSave} loading={isSaving}>
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>

        <Button variant="ghost" size="sm" onClick={onPreview}>
          <Eye className="h-4 w-4 mr-1" />
          Preview
        </Button>

        <Button size="sm" onClick={onPublish}>
          <Send className="h-4 w-4 mr-1" />
          Publish
        </Button>
      </div>
    </div>
  );
}
