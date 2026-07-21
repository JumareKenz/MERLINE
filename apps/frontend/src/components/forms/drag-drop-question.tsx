'use client';

import { useCallback, useRef } from 'react';
import { useFormBuilderStore } from '@/stores/form-builder-store';
import { CanvasQuestion } from './canvas-question';

interface DragDropQuestionProps {
  questionId: string;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function DragDropQuestion({ questionId, index, isSelected, onSelect }: DragDropQuestionProps) {
  const { moveQuestion, duplicateQuestion, removeQuestion } = useFormBuilderStore();
  const dragRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', questionId);
    e.dataTransfer.effectAllowed = 'move';
  }, [questionId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId && sourceId !== questionId) {
      moveQuestion(sourceId, index);
    }
  }, [questionId, index, moveQuestion]);

  return (
    <div
      ref={dragRef}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="group"
    >
      <CanvasQuestion
        questionId={questionId}
        isSelected={isSelected}
        onSelect={onSelect}
        onDuplicate={duplicateQuestion}
        onDelete={removeQuestion}
      />
    </div>
  );
}
