'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import {
  useLogframe,
  useUpsertLogframe,
  useAddLogframeRow,
  useUpdateLogframeRow,
  useDeleteLogframeRow,
} from '@/hooks/use-logframe';
import { LogframeRowItem } from './logframe-row';
import type { CreateLogframeRowDto, UpdateLogframeRowDto } from '@/types/logframe';
import { Network, Plus, Save, Target, Loader2, Check, Edit3, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const LEVEL_LEGEND = [
  { level: 'Outcome', color: 'bg-blue-400', desc: 'High-level changes the project contributes to' },
  { level: 'Output', color: 'bg-violet-400', desc: 'Direct results of project activities' },
  { level: 'Activity', color: 'bg-emerald-400', desc: 'Actions taken to produce outputs' },
  { level: 'Input', color: 'bg-orange-400', desc: 'Resources required for activities' },
];

interface LogframeBuilderProps {
  projectId: string;
  projectName: string;
}

export function LogframeBuilder({ projectId, projectName }: LogframeBuilderProps) {
  const { data: logframe, isLoading } = useLogframe(projectId);
  const upsertLogframe = useUpsertLogframe(projectId);
  const addRow = useAddLogframeRow(projectId);
  const updateRow = useUpdateLogframeRow(projectId);
  const deleteRow = useDeleteLogframeRow(projectId);

  const [editingGoal, setEditingGoal] = useState(false);
  const [goal, setGoal] = useState('');
  const [goalNarrative, setGoalNarrative] = useState('');

  const startEditingGoal = () => {
    setGoal(logframe?.goal ?? '');
    setGoalNarrative(logframe?.goalNarrative ?? '');
    setEditingGoal(true);
  };

  const saveGoal = async () => {
    await upsertLogframe.mutateAsync({ goal, goalNarrative });
    setEditingGoal(false);
  };

  const handleUpdate = (rowId: string, data: UpdateLogframeRowDto) => {
    updateRow.mutate({ rowId, data });
  };

  const handleDelete = (rowId: string) => {
    deleteRow.mutate(rowId);
  };

  const handleAddChild = (data: CreateLogframeRowDto) => {
    addRow.mutate(data);
  };

  const handleAddOutcome = () => {
    addRow.mutate({
      level: 'outcome',
      title: 'New Outcome',
    });
  };

  const createNewLogframe = async () => {
    await upsertLogframe.mutateAsync({
      goal: 'Project Goal',
      goalNarrative: '',
    });
    startEditingGoal();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!logframe) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Logframe</h1>
          <p className="text-[13px] text-foreground-tertiary mt-0.5">{projectName}</p>
        </div>
        <EmptyState
          icon={<Network className="h-10 w-10" strokeWidth={1.5} />}
          title="No logframe yet"
          description="A logical framework maps the causal chain from activities to your project goal. Create one to structure your theory of change."
          action={
            <Button
              size="sm"
              className="h-8 px-3 text-[13px]"
              disabled={upsertLogframe.isPending}
              onClick={createNewLogframe}
            >
              {upsertLogframe.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5 mr-1.5" />
              )}
              Create Logframe
            </Button>
          }
        />
        <div className="rounded-lg border border-border bg-background-subtle p-4">
          <p className="text-[12px] font-semibold text-foreground-secondary uppercase tracking-wide mb-3">
            Level Legend
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {LEVEL_LEGEND.map((l) => (
              <div key={l.level} className="flex items-start gap-2">
                <span className={cn('w-2.5 h-2.5 rounded-full mt-1 shrink-0', l.color)} />
                <div>
                  <p className="text-[12px] font-semibold">{l.level}</p>
                  <p className="text-[11px] text-foreground-tertiary">{l.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const outcomes = (logframe.outcomes ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Logframe</h1>
          <p className="text-[13px] text-foreground-tertiary mt-0.5">{projectName}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-[13px] shrink-0"
          onClick={handleAddOutcome}
          disabled={addRow.isPending}
        >
          {addRow.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5 mr-1.5" />
          )}
          Add Outcome
        </Button>
      </div>

      {/* Goal row */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
              Goal
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {editingGoal ? (
            <div className="space-y-2">
              <Input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="e.g. Improved health outcomes for children under 5"
                className="font-semibold text-[14px]"
                onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
              />
              <Textarea
                value={goalNarrative}
                onChange={(e) => setGoalNarrative(e.target.value)}
                placeholder="Goal narrative / justification (optional)"
                rows={2}
                className="text-[12px] resize-none"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 px-3 text-[12px]"
                  onClick={saveGoal}
                  disabled={upsertLogframe.isPending || !goal.trim()}
                >
                  {upsertLogframe.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5 mr-1" />
                  )}
                  Save Goal
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[12px]"
                  onClick={() => setEditingGoal(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="group flex items-start gap-2">
              <div className="flex-1">
                <p className="text-[14px] font-semibold text-foreground">{logframe.goal}</p>
                {logframe.goalNarrative && (
                  <p className="text-[12px] text-foreground-secondary mt-0.5">{logframe.goalNarrative}</p>
                )}
              </div>
              <Button
                size="xs"
                variant="ghost"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={startEditingGoal}
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Level legend */}
      <div className="flex flex-wrap gap-4">
        {LEVEL_LEGEND.map((l) => (
          <div key={l.level} className="flex items-center gap-1.5">
            <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', l.color)} />
            <span className="text-[12px] text-foreground-secondary">{l.level}</span>
          </div>
        ))}
      </div>

      {/* Outcomes tree */}
      {outcomes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-[13px] font-medium text-foreground-secondary mb-1">No outcomes yet</p>
          <p className="text-[12px] text-foreground-tertiary mb-4">
            Add outcomes to define what changes this project aims to achieve.
          </p>
          <Button
            size="sm"
            className="h-8 px-3 text-[13px]"
            onClick={handleAddOutcome}
            disabled={addRow.isPending}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add First Outcome
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {outcomes.map((row) => (
            <LogframeRowItem
              key={row.id}
              row={row}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onAddChild={handleAddChild}
              isUpdating={updateRow.isPending}
              isDeleting={deleteRow.isPending}
            />
          ))}
        </div>
      )}

      {/* Summary stats */}
      {outcomes.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {LEVEL_LEGEND.map((l) => {
            const count = countByLevel(outcomes, l.level.toLowerCase() as any);
            return (
              <div
                key={l.level}
                className="rounded-md border border-border bg-background-subtle p-3 text-center"
              >
                <p className="text-xl font-semibold tabular-nums">{count}</p>
                <p className="text-[12px] text-foreground-tertiary">{l.level}s</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function countByLevel(rows: any[], level: string): number {
  let count = 0;
  for (const row of rows) {
    if (row.level === level) count++;
    if (row.children?.length) count += countByLevel(row.children, level);
  }
  return count;
}
