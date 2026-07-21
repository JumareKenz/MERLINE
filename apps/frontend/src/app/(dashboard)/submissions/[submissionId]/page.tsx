'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSubmission } from '@/hooks/use-submissions';
import { SubmissionDetailView } from '@/components/submissions/submission-detail';
import { SubmissionReview } from '@/components/submissions/submission-review';
import { SubmissionQualityCard } from '@/components/submissions/submission-quality-card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { ArrowLeft } from 'lucide-react';

export default function SubmissionDetailPage() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const { data, isLoading, isError, error, refetch } = useSubmission(submissionId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-96" />
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={error?.message} onRetry={() => refetch()} />;
  }

  const submission = data?.data?.data;
  if (!submission) return <ErrorState message="Submission not found" />;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/submissions" className="inline-flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" />
          Back to Submissions
        </Link>
        <h1 className="text-3xl font-bold text-foreground font-mono">
          Submission {submissionId.slice(0, 8)}...
        </h1>
      </div>

      <SubmissionQualityCard
        completionRate={submission.quality_score ?? 0}
        avgTimeSeconds={submission.time_taken_seconds}
        flagRate={submission.flagged_answers ? Math.round((submission.flagged_answers / Math.max(submission.answer_count, 1)) * 100) : 0}
        totalFlags={submission.flagged_answers}
        totalSubmissions={1}
      />

      <SubmissionReview submission={submission} />

      <SubmissionDetailView submission={submission} />
    </div>
  );
}
