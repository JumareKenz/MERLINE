'use client';

import { useRouter, useParams } from 'next/navigation';
import { useWorkspace } from '@/components/study-workspace/workspace-shell';
import { useStudyAllowedTransitions, useTransitionStudy } from '@/hooks/use-studies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/status-badge';
import { computeSteps } from '@/components/study-workspace/workflow-nav';
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const STATUS_DESCRIPTIONS: Record<string, { label: string; desc: string; color: string }> = {
  DRAFT: { label: 'Draft', desc: 'Study is being designed', color: 'text-foreground-tertiary' },
  PLANNED: { label: 'Planned', desc: 'Study has been planned and is ready for design review', color: 'text-blue-600' },
  IN_DESIGN: { label: 'In Design', desc: 'Active design phase', color: 'text-violet-600' },
  DESIGN_REVIEW: { label: 'Design Review', desc: 'Submitted for internal review', color: 'text-amber-600' },
  APPROVED: { label: 'Approved', desc: 'Ready for field data collection', color: 'text-success' },
  DATA_COLLECTION: { label: 'Data Collection', desc: 'Field data collection in progress', color: 'text-primary' },
};

export default function ReviewStep() {
  const { study, design } = useWorkspace();
  const { studyId } = useParams<{ studyId: string }>();
  const router = useRouter();
  const [notes, setNotes] = useState('');

  const { data: transitionsData } = useStudyAllowedTransitions(studyId);
  const transitionMutation = useTransitionStudy();
  const steps = computeSteps(studyId, design, study);

  const completedSteps = steps.filter((s) => s.complete);
  const incompleteSteps = steps.filter((s) => !s.complete && s.id !== 'review');
  const readyForReview = incompleteSteps.length === 0;
  const isApproved = ['APPROVED', 'DATA_COLLECTION', 'approved', 'data_collection'].includes(study.status ?? '');

  const allowedTransitions: string[] = transitionsData ?? [];

  const handleTransition = (status: string) => {
    transitionMutation.mutate(
      { id: studyId, data: { status: status as any } },
      {
        onSuccess: () => {
          if (['APPROVED', 'approved'].includes(status)) {
            // Success! Show celebration state
          }
        },
      },
    );
  };

  const statusInfo = STATUS_DESCRIPTIONS[study.status?.toUpperCase() ?? 'DRAFT'];

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight">Review & Approve</h1>
        <p className="text-[13px] text-foreground-tertiary mt-0.5">
          Review your study design completeness and advance through the approval workflow.
        </p>
      </div>

      {/* Current status */}
      <Card className={cn(
        'border-2',
        isApproved ? 'border-success/30 bg-success/5' : 'border-border',
      )}>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            {isApproved ? (
              <CheckCircle2 className="h-8 w-8 text-success shrink-0" />
            ) : (
              <div className="h-8 w-8 rounded-full border-2 border-primary flex items-center justify-center shrink-0">
                <span className="text-[13px] font-semibold text-primary">
                  {study.status?.toUpperCase().charAt(0) ?? 'D'}
                </span>
              </div>
            )}
            <div>
              <p className="text-[13px] font-semibold">
                {isApproved ? '✓ Study Approved — Ready for Field Deployment' : `Current Status: ${statusInfo?.label ?? study.status}`}
              </p>
              <p className="text-[12px] text-foreground-tertiary mt-0.5">
                {isApproved
                  ? 'This study design has been approved. Enumerators can now be assigned and data collection can begin.'
                  : statusInfo?.desc ?? 'Advance through the workflow to get this study approved.'}
              </p>
            </div>
            <div className="ml-auto">
              <StatusBadge status={study.status ?? 'draft'} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Design completeness */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Design Completeness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {steps.filter((s) => s.id !== 'review').map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                {step.complete ? (
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                )}
                <span className={cn(
                  'text-[13px] flex-1',
                  step.complete ? 'text-foreground' : 'text-foreground-secondary',
                )}>
                  {step.label}
                </span>
                {step.sublabel && (
                  <span className="text-[12px] text-foreground-tertiary">{step.sublabel}</span>
                )}
                {!step.complete && (
                  <Button
                    size="xs"
                    variant="ghost"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => router.push(step.href)}
                  >
                    Complete →
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] text-foreground-tertiary">Overall completion</span>
              <span className="text-[12px] font-semibold">{completedSteps.length}/{steps.length - 1} steps</span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  readyForReview ? 'bg-success' : 'bg-primary',
                )}
                style={{ width: `${(completedSteps.length / (steps.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI summary */}
      <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-[12px] text-foreground-secondary">
          Ask the <strong>AI Copilot</strong> to &quot;Generate a study design summary&quot; — it will produce a shareable narrative you can use in your review submission.
        </p>
      </div>

      {/* Transition actions */}
      {!isApproved && allowedTransitions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Advance Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-[12px] text-foreground-tertiary">Notes (optional)</p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add review notes or justification for this status change…"
                rows={2}
                className="text-[13px] resize-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {allowedTransitions.map((status) => {
                const isApprovalStep = ['APPROVED', 'approved'].includes(status);
                return (
                  <Button
                    key={status}
                    size="sm"
                    variant={isApprovalStep ? 'default' : 'outline'}
                    className={cn('h-8 text-[13px]', isApprovalStep && 'bg-success hover:bg-success/90')}
                    disabled={transitionMutation.isPending}
                    onClick={() => handleTransition(status)}
                  >
                    {transitionMutation.isPending && transitionMutation.variables?.data?.status === status && (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    )}
                    {isApprovalStep ? '✓ Approve Study' : `Move to ${status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved → next step */}
      {isApproved && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="p-5">
            <p className="text-[14px] font-semibold text-success mb-2">Ready for data collection</p>
            <p className="text-[13px] text-foreground-secondary mb-4">
              Your study design is approved. The next step is to assign enumerators and deploy questionnaires for field data collection.
            </p>
            <Button
              size="sm"
              className="h-8 px-4 text-[13px]"
              onClick={() => router.push(`/assignments/new?study_id=${studyId}`)}
            >
              Create Assignments <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" className="h-8 text-[13px]" onClick={() => router.push(`/studies/${studyId}/design/instruments`)}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Instruments
        </Button>
      </div>
    </div>
  );
}
