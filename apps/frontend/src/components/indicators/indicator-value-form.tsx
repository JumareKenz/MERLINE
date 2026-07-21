'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { RecordIndicatorValueDto } from '@/types/indicator';

const valueSchema = z.object({
  value: z.coerce.number({ required_error: 'Value is required', invalid_type_error: 'Value must be a number' }),
  period: z.string().min(1, 'Period is required'),
  notes: z.string().max(500).optional(),
});

interface IndicatorValueFormProps {
  onSubmit: (data: RecordIndicatorValueDto) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function IndicatorValueForm({ onSubmit, isSubmitting, onCancel }: IndicatorValueFormProps) {
  const form = useForm<z.infer<typeof valueSchema>>({
    resolver: zodResolver(valueSchema),
    defaultValues: { value: 0, period: new Date().toISOString().slice(0, 7), notes: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="value" render={({ field }) => (
          <FormItem><FormLabel>Value *</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="period" render={({ field }) => (
          <FormItem><FormLabel>Period *</FormLabel><FormControl><Input type="month" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Optional notes about this value" className="min-h-[60px]" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end gap-3">
          {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" loading={isSubmitting}>Record Value</Button>
        </div>
      </form>
    </Form>
  );
}
