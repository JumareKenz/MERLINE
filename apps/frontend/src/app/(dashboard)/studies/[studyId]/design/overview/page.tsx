'use client';

import { useRouter, useParams } from 'next/navigation';
import { useWorkspace } from '@/components/study-workspace/workspace-shell';
import { computeSteps } from '@/components/study-workspace/workflow-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSilentUpdateStudy } from '@/hooks/use-studies';
import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowRight, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { StatusBadge } from '@/components/shared/status-badge';
import { cn } from '@/lib/utils';

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
  const updateStudy = useSilentUpdateStudy();
  const router = useRouter();

  const [title, setTitle] = useState(study.title);
  const [description, setDescription] = useState(study.description ?? '');
  const [type, setType] = useState(study.type ?? study.study_type ?? '');
  const [startDate, setStartDate] = useState(study.start_date ?? study.startDate ?? '');
  const [endDate, setEndDate] = useState(study.end_date ?? study.endDate ?? '');
  const [titleError, setTitleError] = useState('');

  const fieldSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fieldSaveStatus, setFieldSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const scheduleFieldSave = useCallback(
    (data: Record<string, unknown>) => {
      if (fieldSaveTimer.current) clearTimeout(fieldSaveTimer.current);
      if (fieldResetTimer.current) clearTimeout(fieldResetTimer.current);
      setFieldSaveStatus('saving');
      fieldSaveTimer.current = setTimeout(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updateStudy.mutate({ id: studyId, data: data as any }, {
          onSuccess: () => {
            setFieldSaveStatus('saved');
            fieldResetTimer.current = setTimeout(() => setFieldSaveStatus('idle'), 2500);
          },
          onError: () => setFieldSaveStatus('error'),
        });
      }, 800);
    },
    [studyId, updateStudy],
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (fieldSaveTimer.current) clearTimeout(fieldSaveTimer.current);
      if (fieldResetTimer.current) clearTimeout(fieldResetTimer.current);
    };
  }, []);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (val.trim().length < 3) {
      setTitleError(val.trim().length === 0 ? 'Title is required' : 'Title must be at least 3 characters');
    } else {
      setTitleError('');
      scheduleFieldSave({ title: val });
    }
  };

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    scheduleFieldSave({ description: val });
  };

  const handleTypeChange = (val: string) => {
    setType(val);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateStudy.mutate({ id: studyId, data: { study_type: val as any } });
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    scheduleFieldSave({ start_date: val || undefined });
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    scheduleFieldSave({ end_date: val || undefined });
  };

  const steps = computeSteps(studyId, design, study);
  const completedCount = steps.filter((s) => s.complete).length;

  const combinedSaveStatus = fieldSaveStatus !== 'idle' ? fieldSaveStatus : saveStatus;

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
          {/* Inline save indicator */}
          {combinedSaveStatus === 'saving' && (
            <span className="text-[11px] text-foreground-tertiary animate-pulse">Saving…</span>
          )}
          {combinedSaveStatus === 'saved' && (
            <span className="text-[11px] text-success">Saved</span>
          )}
          {combinedSaveStatus === 'error' && (
            <span className="text-[11px] text-error flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Save failed
            </span>
          )}
        </div>
      </div>

      {/* Step completion grid */}
      <div className="grid grid-cols-4 gap-2">
        {steps.map((step) => (
          <button
            key={step.id}
            onClick={() => router.push(step.href)}
            className={cn(
              'rounded-md border p-2.5 text-left transition-colors hover:border-primary/40',
              step.complete
                ? 'border-success/30 bg-success/5'
                : 'border-border bg-background-subtle',
            )}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              {step.complete ? (
                <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
              ) : (
                <Circle className="h-3 w-3 text-foreground-tertiary shrink-0" />
              )}
              <p className={cn(
                'text-[11px] font-medium truncate',
                step.complete ? 'text-success' : 'text-foreground-tertiary',
              )}>
                {step.label}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Core study details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Study Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="title" className="text-[13px]">
                Study Title <span className="text-error">*</span>
              </Label>
              <span className={cn(
                'text-[11px]',
                title.length > 110 ? 'text-warning' : 'text-foreground-tertiary',
              )}>
                {title.length}/120
              </span>
            </div>
            <Input
              id="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              maxLength={120}
              className={cn('text-[13px]', titleError && 'border-error focus-visible:ring-error/30')}
              aria-invalid={!!titleError}
              aria-describedby={titleError ? 'title-error' : undefined}
            />
            {titleError && (
              <p id="title-error" className="text-[12px] text-error flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {titleError}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc" className="text-[13px]">Purpose / Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              rows={3}
              placeholder="Describe the purpose and background of this study…"
              className="text-[13px] resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px]">Study Type</Label>
            <Select value={type} onValueChange={handleTypeChange}>
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
              <Input
                id="start"
                type="date"
                value={startDate?.split('T')[0] ?? ''}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="text-[13px] h-8"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end" className="text-[13px]">End Date</Label>
              <Input
                id="end"
                type="date"
                value={endDate?.split('T')[0] ?? ''}
                min={startDate?.split('T')[0] ?? undefined}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="text-[13px] h-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          size="sm"
          className="h-8 px-4 text-[13px]"
          disabled={!!titleError || title.trim().length < 3}
          onClick={() => router.push(`/studies/${studyId}/design/research`)}
        >
          Next: Research Design <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}
