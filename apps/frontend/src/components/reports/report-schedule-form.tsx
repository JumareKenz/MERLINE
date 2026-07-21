'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { reportScheduleSchema, type ReportScheduleFormData } from '@/lib/validations';
import { useCreateReportSchedule } from '@/hooks/use-reports';

interface ReportScheduleFormProps {
  reportId: string;
  onSuccess?: () => void;
}

export function ReportScheduleForm({ reportId, onSuccess }: ReportScheduleFormProps) {
  const createSchedule = useCreateReportSchedule();

  const form = useForm<ReportScheduleFormData>({
    resolver: zodResolver(reportScheduleSchema),
    defaultValues: {
      frequency: 'monthly',
      recipients: [],
    },
  });

  const onSubmit = (data: ReportScheduleFormData) => {
    createSchedule.mutate(
      { reportId, data },
      { onSuccess: () => { form.reset(); onSuccess?.(); } }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequency</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="recipients"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipients (comma-separated emails)</FormLabel>
              <FormControl>
                <Input
                  placeholder="user@example.com, other@example.com"
                  onChange={(e) => field.onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" loading={createSchedule.isPending}>
          Create Schedule
        </Button>
      </form>
    </Form>
  );
}
