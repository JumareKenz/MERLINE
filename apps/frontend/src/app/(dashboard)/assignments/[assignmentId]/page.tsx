'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAssignment } from '@/hooks/use-assignments';
import { useSubmissions } from '@/hooks/use-submissions';
import { StatusBadge } from '@/components/shared/status-badge';
import { AssignmentProgress } from '@/components/assignments/assignment-progress';
import { AssignmentActions } from '@/components/assignments/assignment-actions';
import { SubmissionTable } from '@/components/submissions/submission-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Calendar, User, FileText, Target, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AssignmentDetailPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { data, isLoading, isError, error, refetch } = useAssignment(assignmentId);
  const { data: submissionsData, isLoading: subsLoading } = useSubmissions({ assignment_id: assignmentId });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={error?.message} onRetry={() => refetch()} />;
  }

  const assignment = data?.data?.data;
  if (!assignment) return <ErrorState message="Assignment not found" />;

  const submissions = submissionsData?.data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/assignments" className="inline-flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" />
          Back to Assignments
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={assignment.status} />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {assignment.questionnaire?.title || 'Assignment'}
            </h1>
          </div>
          <AssignmentActions assignment={assignment} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">
                {assignment.enumerator
                  ? `${assignment.enumerator.firstName} ${assignment.enumerator.lastName}`
                  : '—'}
              </p>
              <p className="text-xs text-foreground-secondary">Enumerator</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{assignment.questionnaire?.title || '—'}</p>
              <p className="text-xs text-foreground-secondary">Questionnaire</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <Target className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{assignment.completed_count}/{assignment.target_count}</p>
              <p className="text-xs text-foreground-secondary">Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">
                {assignment.due_date ? formatDate(assignment.due_date) : 'No deadline'}
              </p>
              <p className="text-xs text-foreground-secondary">Due Date</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignmentProgress target={assignment.target_count} completed={assignment.completed_count} size="md" />
          <div className="grid grid-cols-3 gap-4 mt-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{assignment.progress_percentage}%</p>
              <p className="text-xs text-foreground-secondary">Completion</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{assignment.completed_count}</p>
              <p className="text-xs text-foreground-secondary">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground-tertiary">{assignment.target_count - assignment.completed_count}</p>
              <p className="text-xs text-foreground-secondary">Remaining</p>
            </div>
          </div>
          {assignment.notes && (
            <div className="mt-4 p-3 rounded-md bg-background-surface">
              <p className="text-xs text-foreground-secondary mb-1">Notes</p>
              <p className="text-sm">{assignment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-4">Linked Submissions</h2>
        <SubmissionTable
          data={submissions}
          isLoading={subsLoading}
        />
      </div>
    </div>
  );
}
