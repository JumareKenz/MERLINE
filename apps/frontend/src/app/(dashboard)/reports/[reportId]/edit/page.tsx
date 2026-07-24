'use client';

import { useParams } from 'next/navigation';
import { useReport } from '@/hooks/use-reports';
import { ReportForm } from '@/components/reports/report-form';
import { LoadingState } from '@/components/shared/loading-state';
import { ErrorState } from '@/components/shared/error-state';

export default function EditReportPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const { data, isLoading, isError, error, refetch } = useReport(reportId);

  if (isLoading) return <LoadingState message="Loading report..." />;
  if (isError) return <ErrorState message={error?.message} onRetry={() => refetch()} />;

  const report = data?.data?.data;
  if (!report) return <ErrorState message="Report not found" />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Edit Report</h1>
        <p className="text-[13px] text-foreground-tertiary mt-0.5">Update report configuration</p>
      </div>
      <ReportForm report={report} />
    </div>
  );
}
