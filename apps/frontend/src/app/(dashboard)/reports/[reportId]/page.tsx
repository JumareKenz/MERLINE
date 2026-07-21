'use client';

import { useParams } from 'next/navigation';
import { useReport, useDeleteReport, useCloneReport, useGenerateReport } from '@/hooks/use-reports';
import { ReportViewer } from '@/components/reports/report-viewer';
import { ReportScheduleForm } from '@/components/reports/report-schedule-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Copy, Edit } from 'lucide-react';

export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);

  const { data: res, isLoading, isError, error, refetch } = useReport(reportId);
  const deleteReport = useDeleteReport();
  const cloneReport = useCloneReport();
  const generateReport = useGenerateReport();

  const report = res?.data?.data;

  const handleDelete = () => {
    deleteReport.mutate(reportId, {
      onSuccess: () => router.push('/reports'),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        {report && (
          <div className="flex items-center gap-2">
            {(report.status === 'draft' || report.status === 'failed') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => generateReport.mutate(reportId)}
                loading={generateReport.isPending}
              >
                Generate
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/reports/${reportId}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => cloneReport.mutate(reportId)}
              loading={cloneReport.isPending}
            >
              <Copy className="h-4 w-4 mr-2" />
              Clone
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDelete(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </div>

      <ReportViewer
        report={report}
        isLoading={isLoading}
        isError={isError}
        error={error as Error | null}
        onRetry={() => refetch()}
      />

      {report && report.status === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportScheduleForm reportId={reportId} />
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Report"
        description="Are you sure you want to delete this report? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleteReport.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
