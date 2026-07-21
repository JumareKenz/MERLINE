'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { reportSchema, type ReportFormData } from '@/lib/validations';
import { useCreateReport, useUpdateReport, useReportTemplates } from '@/hooks/use-reports';
import { useStudies } from '@/hooks/use-studies';
import type { Report } from '@/types/report';

interface ReportFormProps {
  report?: Report;
  studyId?: string;
}

export function ReportForm({ report, studyId }: ReportFormProps) {
  const router = useRouter();
  const createReport = useCreateReport();
  const updateReport = useUpdateReport();
  const { data: templates } = useReportTemplates();
  const { data: studiesData } = useStudies();
  const studies = studiesData?.data?.data || [];

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: report?.title || '',
      description: report?.description || '',
      study_id: studyId || report?.study_id || '',
      template_id: '',
    },
  });

  const onSubmit = (data: ReportFormData) => {
    if (report) {
      updateReport.mutate(
        { id: report.id, data: { title: data.title, description: data.description } },
        { onSuccess: () => router.push(`/reports/${report.id}`) }
      );
    } else {
      createReport.mutate(data as Parameters<typeof createReport.mutate>[0], {
        onSuccess: (res) => {
          const reportId = res?.data?.data?.id;
          if (reportId) router.push(`/reports/${reportId}`);
        },
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter report title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Brief description of the report" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!studyId && (
          <FormField
            control={form.control}
            name="study_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Study</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a study" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {studies.length === 0 ? (
                      <SelectItem value="none" disabled>No studies available</SelectItem>
                    ) : (
                      studies.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="template_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Template</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(templates?.data?.data || []).map((t: { id: string; name: string }) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3">
          <Button type="submit" loading={createReport.isPending || updateReport.isPending}>
            {report ? 'Update Report' : 'Create Report'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
