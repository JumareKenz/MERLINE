'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const participantSchema = z.object({
  displayName: z.string().min(1, 'Name or identifier is required').max(200),
  externalRef: z.string().max(200).optional(),
});

export type ParticipantFormValues = z.infer<typeof participantSchema>;

interface ParticipantFormProps {
  onSubmit: (data: ParticipantFormValues) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function ParticipantForm({ onSubmit, isSubmitting, onCancel }: ParticipantFormProps) {
  const form = useForm<ParticipantFormValues>({
    resolver: zodResolver(participantSchema),
    defaultValues: { displayName: '', externalRef: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Participant 014, or a pseudonym" {...field} />
              </FormControl>
              <FormDescription>
                Use a pseudonym or code rather than a legal name where your consent process requires it.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="externalRef"
          render={({ field }) => (
            <FormItem>
              <FormLabel>External Reference</FormLabel>
              <FormControl>
                <Input placeholder="Optional field-roster ID" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={isSubmitting}>
            Add Participant
          </Button>
        </div>
      </form>
    </Form>
  );
}
