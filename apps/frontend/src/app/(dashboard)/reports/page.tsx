'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useReports, useReportTemplates } from '@/hooks/use-reports';
import { ReportTable } from '@/components/reports/report-table';
import { ReportCard } from '@/components/reports/report-card';
import { ReportTemplateCard } from '@/components/reports/report-template-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { FileText, Plus } from 'lucide-react';
import type { Report, ReportTemplate } from '@/types/report';

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'reports');

  const { data: reportsRes, isLoading, isError, error, refetch } = useReports();
  const { data: templatesRes, isLoading: templatesLoading } = useReportTemplates();

  const reports = reportsRes?.data?.data || [];
  const templates = templatesRes?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-foreground-secondary mt-1">Manage and generate reports</p>
        </div>
        <Button onClick={() => router.push('/reports/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="reports">My Reports</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="pt-4">
          {reports.length > 0 && (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reports.map((report: Report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
          <ReportTable
            data={reports}
            isLoading={isLoading}
            isError={isError}
            error={error as Error | null}
            onRetry={() => refetch()}
          />
        </TabsContent>

        <TabsContent value="templates" className="pt-4">
          {templatesLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg bg-background-elevated p-5 shadow-1">
                  <Skeleton className="h-5 w-32 mb-3" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No templates yet"
              description="Report templates will appear here once created by your administrator."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template: ReportTemplate) => (
                <ReportTemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => router.push(`/reports/new?template=${template.id}`)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
