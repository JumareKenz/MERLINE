'use client';

import { useRouter, useParams } from 'next/navigation';
import { useWorkspace } from '@/components/study-workspace/workspace-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, Plus, Trash2, HelpCircle, Target, Pencil, Check, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const OBJECTIVE_TYPES = [
  { value: 'general' as const, label: 'General', color: 'bg-primary/10 text-primary' },
  { value: 'specific' as const, label: 'Specific', color: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400' },
];

const RQ_PROMPTS = [
  'What is the current status of [indicator] among [population]?',
  'What factors are associated with [outcome] in [context]?',
  'To what extent has [intervention] achieved [objective]?',
  'What barriers and facilitators affect [behavior] among [group]?',
  'How do [factors] vary across [subgroups]?',
];

export default function ResearchDesignStep() {
  const { design, setDesign, markStepComplete } = useWorkspace();
  const { studyId } = useParams<{ studyId: string }>();
  const router = useRouter();

  const [newRQ, setNewRQ] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [objectiveType, setObjectiveType] = useState<'general' | 'specific'>('specific');

  // Inline edit state for research questions
  const [editingRQIndex, setEditingRQIndex] = useState<number | null>(null);
  const [editingRQValue, setEditingRQValue] = useState('');

  // Inline edit state for objectives
  const [editingObjId, setEditingObjId] = useState<string | null>(null);
  const [editingObjValue, setEditingObjValue] = useState('');

  // Track undo refs — allow undo within the toast duration
  const undoRQRef = useRef<{ text: string; index: number } | null>(null);
  const undoObjRef = useRef<{ obj: typeof design.objectives[0]; index: number } | null>(null);

  const addRQ = () => {
    if (!newRQ.trim()) return;
    setDesign((prev) => ({
      ...prev,
      researchQuestions: [...prev.researchQuestions, newRQ.trim()],
    }));
    setNewRQ('');
  };

  const removeRQ = (i: number) => {
    const text = design.researchQuestions[i];
    undoRQRef.current = { text, index: i };
    setDesign((prev) => ({
      ...prev,
      researchQuestions: prev.researchQuestions.filter((_, idx) => idx !== i),
    }));
    toast('Research question removed', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          const saved = undoRQRef.current;
          if (!saved) return;
          setDesign((prev) => {
            const rqs = [...prev.researchQuestions];
            rqs.splice(saved.index, 0, saved.text);
            return { ...prev, researchQuestions: rqs };
          });
          undoRQRef.current = null;
        },
      },
    });
  };

  const startEditRQ = (i: number) => {
    setEditingRQIndex(i);
    setEditingRQValue(design.researchQuestions[i]);
  };

  const commitEditRQ = () => {
    if (editingRQIndex === null) return;
    const val = editingRQValue.trim();
    if (val) {
      setDesign((prev) => {
        const rqs = [...prev.researchQuestions];
        rqs[editingRQIndex] = val;
        return { ...prev, researchQuestions: rqs };
      });
    }
    setEditingRQIndex(null);
    setEditingRQValue('');
  };

  const cancelEditRQ = () => {
    setEditingRQIndex(null);
    setEditingRQValue('');
  };

  const addObjective = () => {
    if (!newObjective.trim()) return;
    setDesign((prev) => ({
      ...prev,
      objectives: [...prev.objectives, { id: uid(), text: newObjective.trim(), type: objectiveType }],
    }));
    setNewObjective('');
  };

  const removeObjective = (id: string) => {
    const idx = design.objectives.findIndex((o) => o.id === id);
    const obj = design.objectives[idx];
    undoObjRef.current = { obj, index: idx };
    setDesign((prev) => ({ ...prev, objectives: prev.objectives.filter((o) => o.id !== id) }));
    toast('Objective removed', {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          const saved = undoObjRef.current;
          if (!saved) return;
          setDesign((prev) => {
            const objs = [...prev.objectives];
            objs.splice(saved.index, 0, saved.obj);
            return { ...prev, objectives: objs };
          });
          undoObjRef.current = null;
        },
      },
    });
  };

  const startEditObj = (id: string) => {
    const obj = design.objectives.find((o) => o.id === id);
    if (!obj) return;
    setEditingObjId(id);
    setEditingObjValue(obj.text);
  };

  const commitEditObj = () => {
    if (!editingObjId) return;
    const val = editingObjValue.trim();
    if (val) {
      setDesign((prev) => ({
        ...prev,
        objectives: prev.objectives.map((o) =>
          o.id === editingObjId ? { ...o, text: val } : o,
        ),
      }));
    }
    setEditingObjId(null);
    setEditingObjValue('');
  };

  const cancelEditObj = () => {
    setEditingObjId(null);
    setEditingObjValue('');
  };

  const updateProblem = (val: string) => {
    setDesign((prev) => ({ ...prev, problemStatement: val }));
  };

  const updateContext = (val: string) => {
    setDesign((prev) => ({ ...prev, researchContext: val }));
  };

  const proceed = () => {
    if (design.researchQuestions.length > 0 || design.objectives.length > 0) {
      markStepComplete('research');
    }
    router.push(`/studies/${studyId}/design/methodology`);
  };

  const isStepComplete = design.researchQuestions.length > 0 && design.objectives.length > 0;
  const generalCount = design.objectives.filter((o) => o.type === 'general').length;
  const specificCount = design.objectives.filter((o) => o.type === 'specific').length;

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight">Research Design</h1>
        <p className="text-[13px] text-foreground-tertiary mt-0.5">
          Define what you want to know and why — the foundation of rigorous research.
        </p>
      </div>

      {/* Problem statement */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" strokeWidth={1.75} />
            <CardTitle className="text-sm font-medium">Problem Statement</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={design.problemStatement}
            onChange={(e) => updateProblem(e.target.value)}
            placeholder="What problem does this study address? Who is affected and why does it matter?"
            rows={3}
            className="text-[13px] resize-none"
          />
          <Textarea
            value={design.researchContext}
            onChange={(e) => updateContext(e.target.value)}
            placeholder="What is the context? What do we already know? What gaps does this study fill?"
            rows={2}
            className="text-[13px] resize-none"
          />
        </CardContent>
      </Card>

      {/* Research Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-blue-600" strokeWidth={1.75} />
              <CardTitle className="text-sm font-medium">Research Questions</CardTitle>
            </div>
            <span className={cn(
              'text-[12px]',
              design.researchQuestions.length === 0
                ? 'text-foreground-tertiary'
                : design.researchQuestions.length <= 5
                ? 'text-foreground-secondary'
                : 'text-warning',
            )}>
              {design.researchQuestions.length} question{design.researchQuestions.length !== 1 ? 's' : ''}
              {design.researchQuestions.length > 5 && ' — consider narrowing focus'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Empty state */}
          {design.researchQuestions.length === 0 && (
            <div className="rounded-md border border-dashed border-border py-6 text-center">
              <p className="text-[13px] text-foreground-tertiary">No research questions yet.</p>
              <p className="text-[12px] text-foreground-tertiary mt-0.5">Add 1-5 focused, answerable questions below.</p>
            </div>
          )}

          {/* Existing questions */}
          {design.researchQuestions.length > 0 && (
            <div className="space-y-2">
              {design.researchQuestions.map((rq, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-md bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 group">
                  <span className="text-[11px] font-semibold text-blue-500 mt-0.5 shrink-0 w-8">RQ{i + 1}</span>

                  {editingRQIndex === i ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editingRQValue}
                        onChange={(e) => setEditingRQValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEditRQ();
                          if (e.key === 'Escape') cancelEditRQ();
                        }}
                        autoFocus
                        className="text-[13px] h-7 flex-1"
                      />
                      <button onClick={commitEditRQ} className="text-success hover:text-success/80 transition-colors">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={cancelEditRQ} className="text-foreground-tertiary hover:text-foreground transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[13px] flex-1 leading-snug">{rq}</p>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={() => startEditRQ(i)}
                          className="text-foreground-tertiary hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeRQ(i)}
                          className="text-foreground-tertiary hover:text-destructive transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new */}
          <div className="flex gap-2">
            <Input
              value={newRQ}
              onChange={(e) => setNewRQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addRQ()}
              placeholder="Type a research question and press Enter…"
              className="text-[13px] flex-1"
            />
            <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={addRQ} disabled={!newRQ.trim()}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Quick prompts */}
          <div className="space-y-1">
            <p className="text-[11px] text-foreground-tertiary font-medium">Templates (click to use):</p>
            <div className="flex flex-wrap gap-1.5">
              {RQ_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => setNewRQ(p)}
                  className="text-[11px] px-2 py-1 rounded border border-border bg-background-subtle hover:bg-background-hover text-foreground-secondary transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objectives */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-600" strokeWidth={1.75} />
              <CardTitle className="text-sm font-medium">Objectives</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {design.objectives.length > 0 && (
                <span className="text-[12px] text-foreground-tertiary">
                  {generalCount} general · {specificCount} specific
                </span>
              )}
              <div className="flex gap-1">
                {OBJECTIVE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setObjectiveType(t.value)}
                    className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors',
                      objectiveType === t.value ? t.color : 'bg-background-subtle text-foreground-tertiary hover:bg-background-hover',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Empty state */}
          {design.objectives.length === 0 && (
            <div className="rounded-md border border-dashed border-border py-6 text-center">
              <p className="text-[13px] text-foreground-tertiary">No objectives yet.</p>
              <p className="text-[12px] text-foreground-tertiary mt-0.5">Start with 1 general, then 3–5 specific objectives.</p>
            </div>
          )}

          {/* Existing objectives */}
          {design.objectives.length > 0 && (
            <div className="space-y-2">
              {design.objectives.map((obj) => (
                <div key={obj.id} className="flex items-start gap-2 p-3 rounded-md bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 group">
                  <Badge
                    variant={obj.type === 'general' ? 'primary' : 'default'}
                    className="text-[10px] shrink-0 mt-0.5"
                  >
                    {obj.type === 'general' ? 'General' : 'Specific'}
                  </Badge>

                  {editingObjId === obj.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editingObjValue}
                        onChange={(e) => setEditingObjValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEditObj();
                          if (e.key === 'Escape') cancelEditObj();
                        }}
                        autoFocus
                        className="text-[13px] h-7 flex-1"
                      />
                      <button onClick={commitEditObj} className="text-success hover:text-success/80 transition-colors">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={cancelEditObj} className="text-foreground-tertiary hover:text-foreground transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[13px] flex-1 leading-snug">{obj.text}</p>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        <button
                          onClick={() => startEditObj(obj.id)}
                          className="text-foreground-tertiary hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeObjective(obj.id)}
                          className="text-foreground-tertiary hover:text-destructive transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addObjective()}
              placeholder={
                objectiveType === 'general'
                  ? 'e.g., To assess the nutritional status of children under 5…'
                  : 'e.g., To determine the prevalence of stunting in Nairobi County…'
              }
              className="text-[13px] flex-1"
            />
            <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={addObjective} disabled={!newObjective.trim()}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <p className="text-[11px] text-foreground-tertiary">
            Each objective should be SMART — Specific, Measurable, Achievable, Relevant, Time-bound.
          </p>
        </CardContent>
      </Card>

      {/* Completeness check */}
      {isStepComplete && (
        <div className="rounded-md border border-success/30 bg-success/5 px-4 py-3 flex items-center gap-2">
          <span className="text-success text-[13px] font-medium">✓ Research design is complete</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" className="h-8 text-[13px]" onClick={() => router.push(`/studies/${studyId}/design/overview`)}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Overview
        </Button>
        <Button size="sm" className="h-8 text-[13px]" onClick={proceed}>
          Methodology <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
