'use client';

import { InterviewTable } from '@/components/interviews/interview-table';
import { useInterviews } from '@/hooks/use-interviews';

export default function InterviewsPage() {
  const { data, isLoading, isError, error, refetch } = useInterviews();
  const interviews = data?.data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Interviews</h1>
        <p className="text-[13px] text-foreground-tertiary mt-0.5">
          Every interview requires a consent record. Start one from a participant&apos;s page.
        </p>
      </div>

      <InterviewTable
        data={interviews}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={() => refetch()}
      />
    </div>
  );
}
