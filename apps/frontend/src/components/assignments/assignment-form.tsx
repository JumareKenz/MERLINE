'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import type { CreateAssignmentDto } from '@/types/assignment';

interface AssignmentFormProps {
  studies?: { id: string; title: string }[];
  questionnaires?: { id: string; title: string }[];
  enumerators?: { id: string; first_name: string; last_name: string }[];
  onSubmit: (data: CreateAssignmentDto) => void;
  isSubmitting?: boolean;
  initialData?: Partial<CreateAssignmentDto>;
}

export function AssignmentForm({
  studies = [],
  questionnaires = [],
  enumerators = [],
  onSubmit,
  isSubmitting,
  initialData,
}: AssignmentFormProps) {
  const [studyId, setStudyId] = useState(initialData?.study_id || '');
  const [questionnaireId, setQuestionnaireId] = useState(initialData?.questionnaire_id || '');
  const [enumeratorId, setEnumeratorId] = useState(initialData?.enumerator_id || '');
  const [targetCount, setTargetCount] = useState(initialData?.target_count?.toString() || '');
  const [dueDate, setDueDate] = useState(initialData?.due_date || '');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyId || !questionnaireId || !enumeratorId) return;
    onSubmit({
      study_id: studyId,
      questionnaire_id: questionnaireId,
      enumerator_id: enumeratorId,
      target_count: targetCount ? parseInt(targetCount, 10) : undefined,
      due_date: dueDate || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Assignment</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="study">Study *</Label>
            <select
              id="study"
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
            <Label htmlFor="questionnaire">Questionnaire *</Label>
            <select
              id="questionnaire"
              value={questionnaireId}
              onChange={(e) => setQuestionnaireId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-background-inset px-3 py-2 text-sm"
              required
            >
              <option value="">Select questionnaire...</option>
              {questionnaires.map((q) => (
                <option key={q.id} value={q.id}>{q.title}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="enumerator">Enumerator *</Label>
            <select
              id="enumerator"
              value={enumeratorId}
              onChange={(e) => setEnumeratorId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-border bg-background-inset px-3 py-2 text-sm"
              required
            >
              <option value="">Select enumerator...</option>
              {enumerators.map((e) => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target">Target Count</Label>
              <Input
                id="target"
                type="number"
                min={1}
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                placeholder="e.g. 50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional instructions..."
              rows={3}
            />
          </div>
          <Button type="submit" disabled={isSubmitting || !studyId || !questionnaireId || !enumeratorId}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Assignment
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
