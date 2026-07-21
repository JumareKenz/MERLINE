'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportTemplateCard } from './report-template-card';
import { useReportTemplates, useCreateReport } from '@/hooks/use-reports';
import { useStudies } from '@/hooks/use-studies';
import type { ReportTemplate } from '@/types/report';

const steps = ['Template', 'Study', 'Configure', 'Generate'];

export function ReportGenerator() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedStudy, setSelectedStudy] = useState<string>('');

  const { data: templatesRes, isLoading: templatesLoading } = useReportTemplates();
  const { data: studiesRes } = useStudies();

  const templates = templatesRes?.data?.data || [];
  const studies = studiesRes?.data?.data || [];
  const createReport = useCreateReport();

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    createReport.mutate(
      {
        title: `Report - ${selectedTemplate.name}`,
        study_id: selectedStudy || undefined,
        template_id: selectedTemplate.id,
      },
      {
        onSuccess: (res) => {
          const reportId = res?.data?.data?.id;
          if (reportId) router.push(`/reports/${reportId}`);
        },
      }
    );
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Generate Report</h1>
        <p className="text-foreground-secondary mt-1">Follow the steps to create a new report</p>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                i <= step ? 'bg-primary text-white' : 'bg-neutral-200 text-foreground-tertiary'
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-sm ${i <= step ? 'text-foreground font-medium' : 'text-foreground-tertiary'}`}>
              {s}
            </span>
            {i < steps.length - 1 && <Separator className="w-8" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Select a Template</h2>
          {templatesLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
                  <CardContent>
                    <Skeleton className="h-12 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template: ReportTemplate) => (
                <ReportTemplateCard
                  key={template.id}
                  template={template}
                  onSelect={setSelectedTemplate}
                  isSelected={selectedTemplate?.id === template.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Select a Study</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {studies.map((study: { id: string; title: string }) => (
              <Card
                key={study.id}
                className={`cursor-pointer hover:shadow-2 ${selectedStudy === study.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedStudy(study.id)}
              >
                <CardContent className="p-4">
                  <p className="font-medium">{study.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Configure Report</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Template: {selectedTemplate?.name}</p>
                <p className="text-sm text-foreground-secondary">{selectedTemplate?.description}</p>
              </div>
              {selectedStudy && (
                <p className="text-sm">
                  Study: {studies.find((s: { id: string }) => s.id === selectedStudy)?.title || 'Selected'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Generate</h2>
          <Card className="bg-primary-50 border-primary">
            <CardContent className="p-6 text-center">
              <p className="text-lg font-medium mb-2">Ready to generate your report</p>
              <p className="text-sm text-foreground-secondary mb-4">
                This will create a report using the {selectedTemplate?.name} template.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
          Back
        </Button>
        <div className="flex gap-2">
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 0 && !selectedTemplate}>
              Continue
            </Button>
          ) : (
            <Button onClick={handleGenerate} loading={createReport.isPending}>
              Generate Report
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
