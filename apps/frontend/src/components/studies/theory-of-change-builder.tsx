'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useUpdateStudy } from '@/hooks/use-studies';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Loader2, GripVertical, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TocItem {
  id: string;
  text: string;
}

export interface TocColumn {
  id: string;
  label: string;
  color: string;
  items: TocItem[];
}

export interface TocData {
  problem: string;
  context: string;
  assumptions: string;
  columns: TocColumn[];
  updatedAt?: string;
}

const DEFAULT_COLUMNS: Omit<TocColumn, 'items'>[] = [
  { id: 'inputs', label: 'Inputs', color: 'bg-slate-100 border-slate-300 dark:bg-slate-900/40 dark:border-slate-700' },
  { id: 'activities', label: 'Activities', color: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800' },
  { id: 'outputs', label: 'Outputs', color: 'bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800' },
  { id: 'short_outcomes', label: 'Short-term\nOutcomes', color: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' },
  { id: 'medium_outcomes', label: 'Medium-term\nOutcomes', color: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800' },
  { id: 'impact', label: 'Long-term\nImpact', color: 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800' },
];

const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function initToc(raw: unknown): TocData {
  const parsed = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const toc = parsed.toc && typeof parsed.toc === 'object'
    ? (parsed.toc as Record<string, unknown>)
    : {};

  const existingColumns = Array.isArray(toc.columns) ? (toc.columns as TocColumn[]) : [];

  const columns = DEFAULT_COLUMNS.map((def) => {
    const existing = existingColumns.find((c) => c.id === def.id);
    return { ...def, items: existing?.items ?? [] };
  });

  return {
    problem: typeof toc.problem === 'string' ? toc.problem : '',
    context: typeof toc.context === 'string' ? toc.context : '',
    assumptions: typeof toc.assumptions === 'string' ? toc.assumptions : '',
    columns,
  };
}

interface TheoryOfChangeBuilderProps {
  studyId: string;
  studyDesign?: unknown;
}

export function TheoryOfChangeBuilder({ studyId, studyDesign }: TheoryOfChangeBuilderProps) {
  const [toc, setToc] = useState<TocData>(() => initToc(studyDesign));
  const [dirty, setDirty] = useState(false);
  const updateStudy = useUpdateStudy();

  const markDirty = useCallback((updater: (prev: TocData) => TocData) => {
    setToc(updater);
    setDirty(true);
  }, []);

  const handleSave = () => {
    const payload = { ...toc, updatedAt: new Date().toISOString() };
    updateStudy.mutate(
      { id: studyId, data: { studyDesign: { toc: payload } as any } },
      {
        onSuccess: () => {
          setDirty(false);
          toast.success('Theory of Change saved');
        },
      },
    );
  };

  const addItem = (colId: string) => {
    markDirty((prev) => ({
      ...prev,
      columns: prev.columns.map((col) =>
        col.id === colId
          ? { ...col, items: [...col.items, { id: uid(), text: '' }] }
          : col,
      ),
    }));
  };

  const updateItem = (colId: string, itemId: string, text: string) => {
    markDirty((prev) => ({
      ...prev,
      columns: prev.columns.map((col) =>
        col.id === colId
          ? { ...col, items: col.items.map((it) => (it.id === itemId ? { ...it, text } : it)) }
          : col,
      ),
    }));
  };

  const removeItem = (colId: string, itemId: string) => {
    markDirty((prev) => ({
      ...prev,
      columns: prev.columns.map((col) =>
        col.id === colId
          ? { ...col, items: col.items.filter((it) => it.id !== itemId) }
          : col,
      ),
    }));
  };

  const totalItems = toc.columns.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-foreground">Theory of Change</p>
          <p className="text-[12px] text-foreground-tertiary mt-0.5">
            Map the causal pathway from inputs to long-term impact
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 px-3 text-[13px]"
          onClick={handleSave}
          disabled={!dirty || updateStudy.isPending}
        >
          {updateStudy.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5 mr-1.5" />
          )}
          Save
        </Button>
      </div>

      {/* Problem statement */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-foreground-secondary uppercase tracking-wide">
            Problem Statement
          </label>
          <Textarea
            value={toc.problem}
            onChange={(e) => markDirty((p) => ({ ...p, problem: e.target.value }))}
            placeholder="What problem does this study address?"
            rows={3}
            className="text-[13px] resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-foreground-secondary uppercase tracking-wide">
            Context
          </label>
          <Textarea
            value={toc.context}
            onChange={(e) => markDirty((p) => ({ ...p, context: e.target.value }))}
            placeholder="Background and contextual factors"
            rows={3}
            className="text-[13px] resize-none"
          />
        </div>
      </div>

      {/* Causal chain */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-2" style={{ minWidth: '900px' }}>
          {toc.columns.map((col, colIdx) => (
            <div key={col.id} className="flex items-start gap-2">
              {/* Column */}
              <div className="w-[168px] shrink-0">
                <div className={cn('rounded-lg border p-3 space-y-2 min-h-[160px]', col.color)}>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground-secondary whitespace-pre-line leading-tight">
                      {col.label}
                    </p>
                    <span className="text-[10px] text-foreground-tertiary tabular-nums">{col.items.length}</span>
                  </div>

                  <div className="space-y-1.5">
                    {col.items.map((item) => (
                      <div key={item.id} className="group flex items-start gap-1">
                        <GripVertical className="h-3.5 w-3.5 text-foreground-tertiary mt-0.5 shrink-0 cursor-grab" />
                        <Input
                          value={item.text}
                          onChange={(e) => updateItem(col.id, item.id, e.target.value)}
                          placeholder="Enter item..."
                          className="h-7 text-[12px] py-0 px-2 flex-1"
                        />
                        <button
                          onClick={() => removeItem(col.id, item.id)}
                          className="h-5 w-5 flex items-center justify-center text-foreground-tertiary opacity-0 group-hover:opacity-100 hover:text-destructive transition-all shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => addItem(col.id)}
                    className="w-full flex items-center justify-center gap-1 text-[11px] text-foreground-tertiary hover:text-foreground border border-dashed border-current/30 rounded py-1.5 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                </div>
              </div>

              {/* Arrow between columns */}
              {colIdx < toc.columns.length - 1 && (
                <div className="flex items-center self-center mt-8">
                  <ChevronRight className="h-5 w-5 text-foreground-tertiary" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Assumptions */}
      <div className="space-y-1.5">
        <label className="text-[12px] font-semibold text-foreground-secondary uppercase tracking-wide">
          Key Assumptions
        </label>
        <Textarea
          value={toc.assumptions}
          onChange={(e) => markDirty((p) => ({ ...p, assumptions: e.target.value }))}
          placeholder="List the key assumptions that must hold for this theory of change to work (one per line)..."
          rows={3}
          className="text-[13px] resize-none"
        />
      </div>

      {/* Summary */}
      {totalItems > 0 && (
        <div className="flex flex-wrap gap-4 rounded-md border border-border bg-background-subtle p-3 text-[12px]">
          {toc.columns.map((col) => (
            <div key={col.id} className="flex items-center gap-1.5">
              <span className="font-semibold tabular-nums">{col.items.length}</span>
              <span className="text-foreground-tertiary">{col.label.replace('\n', ' ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
