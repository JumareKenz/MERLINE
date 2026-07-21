'use client';

import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { Clock, Flag } from 'lucide-react';
import Link from 'next/link';
import type { Submission } from '@/types/submission';

interface SubmissionCardProps {
  submission: Submission;
}

export function SubmissionCard({ submission }: SubmissionCardProps) {
  return (
    <Link href={`/submissions/${submission.id}`}>
      <Card className="hover:shadow-2 transition-shadow cursor-pointer">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-mono text-foreground-tertiary">
                {submission.id.slice(0, 8)}...
              </p>
              {submission.enumerator && (
                <p className="text-sm font-medium">
                  {submission.enumerator.firstName} {submission.enumerator.lastName}
                </p>
              )}
              {submission.questionnaire && (
                <p className="text-xs text-foreground-secondary">{submission.questionnaire.title}</p>
              )}
            </div>
            <StatusBadge status={submission.status} />
          </div>
          <div className="flex items-center gap-3 text-xs text-foreground-secondary">
            {submission.time_taken_seconds && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{Math.floor(submission.time_taken_seconds / 60)}m</span>
              </div>
            )}
            {submission.quality_score !== undefined && submission.quality_score !== null && (
              <span className={submission.quality_score >= 80 ? 'text-success' : 'text-warning'}>
                {submission.quality_score}%
              </span>
            )}
            {submission.flagged_answers ? (
              <div className="flex items-center gap-1 text-error">
                <Flag className="h-3 w-3" />
                <span>{submission.flagged_answers}</span>
              </div>
            ) : null}
          </div>
          <div className="text-xs text-foreground-tertiary">
            {formatRelativeTime(submission.created_at)}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
