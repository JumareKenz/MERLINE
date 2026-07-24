'use client';

import { useRouter, useParams } from 'next/navigation';
import { useWorkspace } from '@/components/study-workspace/workspace-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateStudy } from '@/hooks/use-studies';
import { useState, useEffect } from 'react';
import { ArrowRight, Loader2, FlaskConical, Calendar } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/lib/utils';
import { computeSteps } from '@/components/study-workspace/workflow-nav';

const STUDY_TYPES = [
  { value: 'BASELINE', label: 'Baseline Study' },
  { value: 'MIDLINE', label: 'Midline Evaluation' },
  { value: 'ENDLINE', label: 'Endline Study' },
  { value: 'KAP', label: 'KAP Study (Knowledge, Attitude, Practice)' },
  { value: 'QUALITATIVE', label: 'Qualitative Study' },
  { value: 'CASE_STUDY', label: 'Case Study' },
  { value: 'MIXED_METHODS', label: 'Mixed Methods' },
  { value: 'LOT_QUALITY_ASSURANCE', label: 'Lot Quality Assurance Sampling' },
  { value: 'RAPID_ASSESSMENT', label: 'Rapid Assessment' },
  { value: 'CROSS_SECTIONAL', label: 'Cross-Sectional' },
  { value: 'LONGITUDINAL', label: 'Longitudinal' },
];

export default function OverviewStep() {
  const { study, design, saveStatus } = useWorkspace();
  const { studyId } = useParams<{ studyId: string }>();
  const updateStudy = useUpdateStudy();
  const router = useRouter();

  const [title, setTitle] = useState(study.title);
  const [description, setDescription] = useState(study.description ?? '');
  const [type, setType] = useState(study.type ?? study.study_type ?? '');
  const [startDate, setStartDate] = useState(study.start_date ?? study.startDate ?? '');
  const [endDate, setEndDate] = useState(study.end_date ?? study.endDate ?? '');

  const steps = computeSteps(studyId, design, study);
  const completedCount = steps.filter((s) => s.complete).length;

  const handleSave = () => {
    updateStudy.mutate({
      id: studyId,
      data: {
        title,
        description,
        study_type: type as any,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      },
    });
  };

  return (
    <div className="p-8 max-w-2xl space-y-6">
      {/* Progress summary */}
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <h1 className="text-[17px] font-semibold tracking-tight">Study Overview</h1>
          <p className="text-[13px] text-foreground-tertiary mt-0.5">
            {completedCount} of {steps.length} design steps complete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={study.status} />
          {study.code && (
            <span className="text-[12px] text-foreground-tertiary font-mono">{study.code}</span>
          )}
        </div>
      </div>

      {/* Completion ring */}
      <div className="grid grid-cols-4 gap-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`rounded-md border p-2.5 text-center ${
              step.complete
                ? 'border-success/30 bg-success/5'
                : 'border-border bg-background-subtle'
            }`}
          >
            <p className={`text-[11px] font-medium ${step.complete ? 'text-success' : 'text-foreground-tertiary'}`}>
              {step.complete ? '✓' : '○'} {step.label}
            </p>
          </div>
        ))}
      </div>

      {/* Core study details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Study Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-[13px]">Study Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              className="text-[13px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc" className="text-[13px]">Purpose / Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              rows={3}
              placeholder="Describe the purpose and background of this study…"
              className="text-[13px] resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px]">Study Type</Label>
            <Select value={type} onValueChange={(v) => { setType(v); updateStudy.mutate({ id: studyId, data: { study_type: v as any } }); }}>
              <SelectTrigger className="text-[13px] h-8">
                <SelectValue placeholder="Select study type…" />
              </SelectTrigger>
              <SelectContent>
                {STUDY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-[13px]">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start" className="text-[13px]">Start Date</Label>
              <Input id="start" type="date" value={startDate?.split('T')[0] ?? ''} onChange={(e) => setStartDate(e.target.value)} onBlur={handleSave} className="text-[13px] h-8" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end" className="text-[13px]">End Date</Label>
              <Input id="end" type="date" value={endDate?.split('T')[0] ?? ''} onChange={(e) => setEndDate(e.target.value)} onBlur={handleSave} className="text-[13px] h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          size="sm"
          className="h-8 px-4 text-[13px]"
          onClick={() => router.push(`/studies/${studyId}/design/research`)}
        >
          Next: Research Design <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
