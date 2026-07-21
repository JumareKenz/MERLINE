'use client';

import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubmissionAnswerView } from './submission-answer-view';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import { Clock, User, Smartphone, MapPin, Activity, Flag } from 'lucide-react';
import type { SubmissionDetail } from '@/types/submission';

interface SubmissionDetailViewProps {
  submission: SubmissionDetail;
}

export function SubmissionDetailView({ submission }: SubmissionDetailViewProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Responses</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {submission.answers && submission.answers.length > 0 ? (
              submission.answers.map((answer) => (
                <SubmissionAnswerView key={answer.id} answer={answer} />
              ))
            ) : (
              <p className="text-sm text-foreground-secondary">No answers recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground-secondary">Status</span>
              <StatusBadge status={submission.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground-secondary">Sync</span>
              <StatusBadge
                status={submission.sync_status}
                variant={submission.sync_status === 'synced' ? 'success' : submission.sync_status === 'failed' ? 'error' : 'warning'}
              />
            </div>
            {submission.enumerator && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-foreground-tertiary" />
                <span className="text-sm">{submission.enumerator.first_name} {submission.enumerator.last_name}</span>
              </div>
            )}
            {submission.questionnaire && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-foreground-tertiary" />
                <span className="text-sm">{submission.questionnaire.title}</span>
              </div>
            )}
            {submission.time_taken_seconds && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-foreground-tertiary" />
                <span className="text-sm">{Math.floor(submission.time_taken_seconds / 60)} min</span>
              </div>
            )}
            {submission.quality_score !== undefined && submission.quality_score !== null && (
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-foreground-tertiary" />
                <span className={`text-sm font-medium ${submission.quality_score >= 80 ? 'text-success' : submission.quality_score >= 50 ? 'text-warning' : 'text-error'}`}>
                  Quality: {submission.quality_score}%
                </span>
              </div>
            )}
            {submission.flagged_answers ? (
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-error" />
                <span className="text-sm text-error">{submission.flagged_answers} flagged answers</span>
              </div>
            ) : null}
            {submission.geo_location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-foreground-tertiary" />
                <a
                  href={`https://www.google.com/maps?q=${submission.geo_location.lat},${submission.geo_location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline"
                >
                  {submission.geo_location.lat.toFixed(4)}, {submission.geo_location.lng.toFixed(4)}
                </a>
              </div>
            )}
            {submission.device_info && (
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-foreground-tertiary" />
                <span className="text-sm">Device info available</span>
              </div>
            )}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-foreground-tertiary">
                Started: {formatDateTime(submission.started_at)}
              </p>
              {submission.completed_at && (
                <p className="text-xs text-foreground-tertiary">
                  Completed: {formatDateTime(submission.completed_at)}
                </p>
              )}
              <p className="text-xs text-foreground-tertiary">
                {formatRelativeTime(submission.created_at)}
              </p>
            </div>
          </CardContent>
        </Card>

        {submission.reviewed_by && (
          <Card>
            <CardHeader>
              <CardTitle>Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                Reviewed by: <span className="font-medium">{submission.reviewed_by.name}</span>
              </p>
              {submission.reviewed_at && (
                <p className="text-xs text-foreground-tertiary">{formatDateTime(submission.reviewed_at)}</p>
              )}
              {submission.notes && <p className="text-sm">{submission.notes}</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
