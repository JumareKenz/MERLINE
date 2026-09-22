'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONSENT_SCOPES } from '@/types/consent';

const consentSchema = z.object({
  version: z.string().min(1, 'Consent form version is required').max(50),
  method: z.enum(['VERBAL', 'WRITTEN', 'DIGITAL']),
  allowRecording: z.boolean(),
  allowTranscription: z.boolean(),
  allowAiAnalysis: z.boolean(),
  allowQuotation: z.boolean(),
  allowPublication: z.boolean(),
});

export type ConsentFormValues = z.infer<typeof consentSchema>;

interface ConsentFormProps {
  onSubmit: (data: ConsentFormValues) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function ConsentForm({ onSubmit, isSubmitting, onCancel }: ConsentFormProps) {
  const form = useForm<ConsentFormValues>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      version: '',
      method: 'VERBAL',
      allowRecording: false,
      allowTranscription: false,
      allowAiAnalysis: false,
      allowQuotation: false,
      allowPublication: false,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="version"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Consent Form Version *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., v2.1-en" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Method *</FormLabel>
                <FormControl>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VERBAL">Verbal</SelectItem>
                      <SelectItem value="WRITTEN">Written</SelectItem>
                      <SelectItem value="DIGITAL">Digital</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3 rounded-md border border-border p-4">
          <p className="text-[13px] font-medium text-foreground">Scope of consent</p>
          <p className="text-[12px] text-foreground-tertiary -mt-2">
            Each permission is independent. A participant may allow recording without allowing publication, for example.
          </p>
          {CONSENT_SCOPES.map((scope) => (
            <Controller
              key={scope.key}
              control={form.control}
              name={scope.key as 'allowRecording'}
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4 py-1.5">
                  <div>
                    <p className="text-[13px] font-medium">{scope.label}</p>
                    <p className="text-[12px] text-foreground-tertiary">{scope.helpText}</p>
                  </div>
                  <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                </div>
              )}
            />
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={isSubmitting}>
            Record Consent
          </Button>
        </div>
      </form>
    </Form>
  );
}
