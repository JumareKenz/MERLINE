'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/shared/error-state';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Download, FileText, RotateCw, Clock } from 'lucide-react';
import type { Report } from '@/types/report';
import { useExportReport, useGenerateReport } from '@/hooks/use-reports';

interface ReportViewerProps {
  report?: Report;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const statusVariant: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  generating: 'warning',
  completed: 'success',
  failed: 'error',
};

export function ReportViewer({ report, isLoading, isError, error, onRetry }: ReportViewerProps) {
  const exportReport = useExportReport();
  const generateReport = useGenerateReport();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-4 w-48" />
        <div className="space-y-3 mt-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={error?.message || 'Failed to load report'} onRetry={onRetry} />;
  }

  if (!report) {
    return <ErrorState message="Report not found" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">{report.title}</h1>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant={statusVariant[report.status] || 'default'}>
              {report.status}
            </Badge>
            <span className="text-sm text-foreground-secondary">
              by {report.generated_by?.name || 'Unknown'}
            </span>
            {report.generated_at && (
              <span className="text-sm text-foreground-tertiary flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDateTime(report.generated_at)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(report.status === 'draft' || report.status === 'failed') && (
            <Button
              variant="secondary"
              onClick={() => generateReport.mutate(report.id)}
              loading={generateReport.isPending}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              {report.status === 'failed' ? 'Regenerate' : 'Generate'}
            </Button>
          )}
          {report.status === 'completed' && (
            <>
              <Button
                variant="secondary"
                onClick={() => exportReport.mutate({ id: report.id, format: 'pdf' })}
                loading={exportReport.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                variant="secondary"
                onClick={() => exportReport.mutate({ id: report.id, format: 'docx' })}
                loading={exportReport.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                Word
              </Button>
            </>
          )}
        </div>
      </div>

      {report.status === 'generating' && (
        <Card className="bg-warning-bg border-warning">
          <CardContent className="p-5 flex items-center gap-3">
            <RotateCw className="h-5 w-5 text-warning animate-spin" />
            <div>
              <p className="font-medium text-warning">Report is being generated</p>
              <p className="text-sm text-foreground-secondary">This may take a few moments. Refresh to check status.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {report.status === 'failed' && (
        <Card className="bg-error-bg border-error">
          <CardContent className="p-5">
            <p className="font-medium text-error">Report generation failed</p>
            <p className="text-sm text-foreground-secondary mt-1">Try regenerating the report.</p>
          </CardContent>
        </Card>
      )}

      {report.description && (
        <p className="text-foreground-secondary">{report.description}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Report Content</CardTitle>
        </CardHeader>
        <CardContent>
          {report.status === 'completed' && report.data ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {typeof report.data === 'object' ? (
                <div className="space-y-4">
                  {report.data.summary && (
                    <div>
                      <h3 className="text-lg font-semibold">Executive Summary</h3>
                      <p className="text-foreground-secondary">{report.data.summary}</p>
                    </div>
                  )}
                  {report.data.sections?.map((section: any, i: number) => (
                    <div key={i}>
                      <h3 className="text-base font-semibold">{section.title}</h3>
                      <p className="text-foreground-secondary">{section.content}</p>
                    </div>
                  ))}
                  {report.data.tables?.map((table: any, i: number) => (
                    <div key={i} className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border text-sm">
                        <thead>
                          <tr>{table.headers?.map((h: string, j: number) => <th key={j} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {table.rows?.map((row: any[], j: number) => (
                            <tr key={j}>{row.map((cell: any, k: number) => <td key={k} className="px-3 py-2">{cell}</td>)}</tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-foreground-secondary">{String(report.data)}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-foreground-tertiary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-1">
                No content yet
              </h3>
              <p className="text-sm text-foreground-secondary max-w-sm">
                {report.status === 'generating'
                  ? 'Content will appear once generation completes.'
                  : 'Generate the report to see content.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
