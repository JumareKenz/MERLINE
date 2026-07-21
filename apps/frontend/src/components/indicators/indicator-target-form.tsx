'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { SetIndicatorTargetDto } from '@/types/indicator';

const targetSchema = z.object({
  target_value: z.coerce.number({ required_error: 'Target value is required', invalid_type_error: 'Must be a number' }),
  deadline: z.string().min(1, 'Deadline is required'),
});

interface IndicatorTargetFormProps {
  onSubmit: (data: SetIndicatorTargetDto) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function IndicatorTargetForm({ onSubmit, isSubmitting, onCancel }: IndicatorTargetFormProps) {
  const form = useForm<z.infer<typeof targetSchema>>({
    resolver: zodResolver(targetSchema),
    defaultValues: { target_value: 0, deadline: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="target_value" render={({ field }) => (
          <FormItem><FormLabel>Target Value *</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="deadline" render={({ field }) => (
          <FormItem><FormLabel>Deadline *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end gap-3">
          {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" loading={isSubmitting}>Set Target</Button>
        </div>
      </form>
    </Form>
  );
}
