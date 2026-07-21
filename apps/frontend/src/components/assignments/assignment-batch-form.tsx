'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, X } from 'lucide-react';
import type { BatchAssignDto } from '@/types/assignment';

interface AssignmentBatchFormProps {
  studies?: { id: string; title: string }[];
  questionnaires?: { id: string; title: string }[];
  enumerators?: { id: string; first_name: string; last_name: string }[];
  onSubmit: (data: BatchAssignDto) => void;
  isSubmitting?: boolean;
}

export function AssignmentBatchForm({
  studies = [],
  questionnaires = [],
  enumerators = [],
  onSubmit,
  isSubmitting,
}: AssignmentBatchFormProps) {
  const [studyId, setStudyId] = useState('');
  const [selectedQuestionnaires, setSelectedQuestionnaires] = useState<string[]>([]);
  const [selectedEnumerators, setSelectedEnumerators] = useState<string[]>([]);
  const [targetCount, setTargetCount] = useState('');
  const [dueDate, setDueDate] = useState('');

  const toggleSelection = (id: string, set: string[], setFn: (v: string[]) => void) => {
    setFn(set.includes(id) ? set.filter((s) => s !== id) : [...set, id]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyId || selectedQuestionnaires.length === 0 || selectedEnumerators.length === 0) return;
    onSubmit({
      study_id: studyId,
      questionnaire_ids: selectedQuestionnaires,
      enumerator_ids: selectedEnumerators,
      target_count: targetCount ? parseInt(targetCount, 10) : undefined,
      due_date: dueDate || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Assign</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch-study">Study *</Label>
            <select
              id="batch-study"
              value={studyId}
              onChange={(e) => setStudyId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-background-inset px-3 py-2 text-sm"
              required
            >
              <option value="">Select study...</option>
              {studies.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Questionnaires *</Label>
            <div className="flex flex-wrap gap-2">
              {questionnaires.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => toggleSelection(q.id, selectedQuestionnaires, setSelectedQuestionnaires)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    selectedQuestionnaires.includes(q.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground-secondary border-border hover:border-primary'
                  }`}
                >
                  {q.title}
                  {selectedQuestionnaires.includes(q.id) && <X className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Enumerators *</Label>
            <div className="flex flex-wrap gap-2">
              {enumerators.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggleSelection(e.id, selectedEnumerators, setSelectedEnumerators)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    selectedEnumerators.includes(e.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground-secondary border-border hover:border-primary'
                  }`}
                >
                  {e.first_name} {e.last_name}
                  {selectedEnumerators.includes(e.id) && <X className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batch-target">Target Per Enumerator</Label>
              <Input
                id="batch-target"
                type="number"
                min={1}
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                placeholder="e.g. 25"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-due">Due Date</Label>
              <Input
                id="batch-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting || !studyId || selectedQuestionnaires.length === 0 || selectedEnumerators.length === 0}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Batch Assign ({selectedQuestionnaires.length} Q × {selectedEnumerators.length} E)
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
