'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  GripVertical,
  BarChart3,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LogframeRow, LogframeLevel, UpdateLogframeRowDto, CreateLogframeRowDto } from '@/types/logframe';

const LEVEL_CONFIG: Record<
  LogframeLevel,
  { label: string; color: string; bg: string; childLevel?: LogframeLevel; indent: number }
> = {
  outcome: {
    label: 'Outcome',
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    childLevel: 'output',
    indent: 0,
  },
  output: {
    label: 'Output',
    color: 'text-violet-700 dark:text-violet-400',
    bg: 'bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800',
    childLevel: 'activity',
    indent: 1,
  },
  activity: {
    label: 'Activity',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
    childLevel: 'input',
    indent: 2,
  },
  input: {
    label: 'Input',
    color: 'text-orange-700 dark:text-orange-400',
    bg: 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
    indent: 3,
  },
};

interface LogframeRowProps {
  row: LogframeRow;
  onUpdate: (rowId: string, data: UpdateLogframeRowDto) => void;
  onDelete: (rowId: string) => void;
  onAddChild: (data: CreateLogframeRowDto) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export function LogframeRowItem({
  row,
  onUpdate,
  onDelete,
  onAddChild,
  isUpdating,
  isDeleting,
}: LogframeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(row.title);
  const [description, setDescription] = useState(row.description ?? '');
  const [mov, setMov] = useState(row.meansOfVerification ?? '');
  const [assumptions, setAssumptions] = useState(row.assumptions ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  const cfg = LEVEL_CONFIG[row.level];
  const childLevel = cfg.childLevel;
  const hasChildren = row.children.length > 0;

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = () => {
    if (!title.trim()) return;
    onUpdate(row.id, { title, description, meansOfVerification: mov, assumptions });
    setEditing(false);
  };

  const handleCancel = () => {
    setTitle(row.title);
    setDescription(row.description ?? '');
    setMov(row.meansOfVerification ?? '');
    setAssumptions(row.assumptions ?? '');
    setEditing(false);
  };

  const handleAddChild = () => {
    if (!childLevel) return;
    onAddChild({
      level: childLevel,
      title: `New ${LEVEL_CONFIG[childLevel].label}`,
      parentId: row.id,
    });
    setExpanded(true);
  };

  return (
    <div className={cn('rounded-md border', cfg.bg)}>
      <div className="flex items-start gap-2 p-3">
        <GripVertical className="h-4 w-4 text-foreground-tertiary mt-0.5 cursor-grab shrink-0" />

        <button
          className="shrink-0 mt-0.5"
          onClick={() => setExpanded(!expanded)}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-foreground-tertiary" />
            ) : (
              <ChevronRight className="h-4 w-4 text-foreground-tertiary" />
            )
          ) : (
            <span className="w-4 h-4 block" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <Badge
              variant="default"
              className={cn('text-[10px] shrink-0 px-1.5 h-5 uppercase tracking-wide border bg-transparent', cfg.color)}
            >
              {cfg.label}
            </Badge>

            {editing ? (
              <Input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
                className="h-6 text-[13px] font-medium py-0 border-primary"
              />
            ) : (
              <span
                className="text-[13px] font-medium leading-tight cursor-text hover:text-primary transition-colors"
                onClick={() => setEditing(true)}
              >
                {row.title}
              </span>
            )}
          </div>

          {editing && (
            <div className="mt-2 space-y-2">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="text-[12px] resize-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-foreground-tertiary font-medium block mb-1">
                    Means of Verification
                  </label>
                  <Input
                    value={mov}
                    onChange={(e) => setMov(e.target.value)}
                    placeholder="e.g. Survey data, reports"
                    className="h-7 text-[12px]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-foreground-tertiary font-medium block mb-1">
                    Assumptions
                  </label>
                  <Input
                    value={assumptions}
                    onChange={(e) => setAssumptions(e.target.value)}
                    placeholder="Key assumptions"
                    className="h-7 text-[12px]"
                  />
                </div>
              </div>
            </div>
          )}

          {!editing && (row.description || row.meansOfVerification || row.assumptions) && (
            <div className="mt-1.5 space-y-1">
              {row.description && (
                <p className="text-[12px] text-foreground-secondary">{row.description}</p>
              )}
              <div className="flex flex-wrap gap-3">
                {row.meansOfVerification && (
                  <span className="text-[11px] text-foreground-tertiary">
                    <span className="font-medium">MoV:</span> {row.meansOfVerification}
                  </span>
                )}
                {row.assumptions && (
                  <span className="text-[11px] text-foreground-tertiary">
                    <span className="font-medium">Assumptions:</span> {row.assumptions}
                  </span>
                )}
              </div>
            </div>
          )}

          {row.indicators.length > 0 && !editing && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {row.indicators.map((li) => (
                <span
                  key={li.id}
                  className="inline-flex items-center gap-1 rounded-full bg-background/80 border border-border px-2 py-0.5 text-[11px] text-foreground-secondary"
                >
                  <BarChart3 className="h-3 w-3 text-primary" />
                  {li.indicator.name}
                  {li.target != null && (
                    <span className="text-foreground-tertiary">
                      {' '}
                      → {li.actual ?? '—'}/{li.target}
                      {li.indicator.unit ? ` ${li.indicator.unit}` : ''}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {editing ? (
            <>
              <Button
                size="xs"
                variant="ghost"
                onClick={handleSave}
                disabled={isUpdating}
                className="h-6 w-6 p-0 text-emerald-600"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={handleCancel}
                className="h-6 w-6 p-0"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setEditing(true)}
                className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              {childLevel && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={handleAddChild}
                  className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                  title={`Add ${LEVEL_CONFIG[childLevel].label}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                size="xs"
                variant="ghost"
                onClick={() => onDelete(row.id)}
                disabled={isDeleting}
                className="h-6 w-6 p-0 opacity-60 hover:opacity-100 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {expanded && row.children.length > 0 && (
        <div className="border-t border-current/10 px-3 pb-3 space-y-2 pt-2 ml-6">
          {row.children
            .slice()
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((child) => (
              <LogframeRowItem
                key={child.id}
                row={child}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onAddChild={onAddChild}
                isUpdating={isUpdating}
                isDeleting={isDeleting}
              />
            ))}
        </div>
      )}
    </div>
  );
}
