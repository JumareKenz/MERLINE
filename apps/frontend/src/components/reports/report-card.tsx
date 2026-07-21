import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { FileText, MoreHorizontal, Download, Trash2, Copy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Report } from '@/types/report';
import { useDeleteReport, useCloneReport, useExportReport } from '@/hooks/use-reports';

const statusVariant: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  generating: 'warning',
  completed: 'success',
  failed: 'error',
};

interface ReportCardProps {
  report: Report;
}

export function ReportCard({ report }: ReportCardProps) {
  const router = useRouter();
  const deleteReport = useDeleteReport();
  const cloneReport = useCloneReport();
  const exportReport = useExportReport();

  return (
    <Card className="hover:shadow-2 transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <CardTitle
                className="text-base cursor-pointer hover:text-primary"
                onClick={() => router.push(`/reports/${report.id}`)}
              >
                {report.title}
              </CardTitle>
              <p className="text-xs text-foreground-tertiary mt-0.5">
                {report.generated_at ? formatDate(report.generated_at) : 'Not generated'}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {report.status === 'completed' && (
                <DropdownMenuItem onClick={() => exportReport.mutate({ id: report.id, format: 'pdf' })}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => cloneReport.mutate(report.id)}>
                <Copy className="h-4 w-4 mr-2" />
                Clone
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-error"
                onClick={() => deleteReport.mutate(report.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {report.description && (
          <p className="text-sm text-foreground-secondary line-clamp-2">{report.description}</p>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant[report.status] || 'default'} size="sm">
            {report.status}
          </Badge>
          <span className="text-xs text-foreground-tertiary">
            by {report.generated_by?.name || 'Unknown'}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
