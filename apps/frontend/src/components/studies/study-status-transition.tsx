'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { StudyStatus } from '@/types/study';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  planned: 'Planned',
  in_design: 'In Design',
  design_review: 'Design Review',
  approved: 'Approved',
  pre_test: 'Pre-Test',
  data_collection: 'Data Collection',
  data_cleaning: 'Data Cleaning',
  analysis: 'Analysis',
  reporting: 'Reporting',
  completed: 'Completed',
  archived: 'Archived',
};

interface StudyStatusTransitionProps {
  allowedTransitions: StudyStatus[];
  currentStatus: StudyStatus;
  onTransition: (status: StudyStatus, reason?: string) => void;
  isTransitioning?: boolean;
}

export function StudyStatusTransition({ allowedTransitions, currentStatus, onTransition, isTransitioning }: StudyStatusTransitionProps) {
  const [selectedStatus, setSelectedStatus] = useState<StudyStatus | ''>('');
  const [reason, setReason] = useState('');

  if (!allowedTransitions.length) return null;

  const handleTransition = () => {
    if (!selectedStatus) return;
    onTransition(selectedStatus as StudyStatus, reason || undefined);
    setSelectedStatus('');
    setReason('');
  };

  return (
    <div className="space-y-3 p-4 bg-background-surface rounded-lg border border-border">
      <p className="text-sm font-medium">Transition Status</p>
      <div className="flex items-center gap-3">
        <span className="text-xs text-foreground-secondary whitespace-nowrap">From: {STATUS_LABELS[currentStatus]}</span>
        <span className="text-foreground-tertiary">&rarr;</span>
        <Select value={selectedStatus} onValueChange={(v) => setSelectedStatus(v as StudyStatus)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {allowedTransitions.map((status) => (
              <SelectItem key={status} value={status}>{STATUS_LABELS[status]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleTransition} disabled={!selectedStatus} loading={isTransitioning}>
          Transition
        </Button>
      </div>
      {selectedStatus && (
        <Textarea
          placeholder="Reason for transition (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-h-[60px]"
        />
      )}
    </div>
  );
}
