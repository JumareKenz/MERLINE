'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Questionnaire, CreateQuestionnaireDto } from '@/types/questionnaire';

const questionnaireSchema = z.object({
  title: z.string().min(3).max(500),
  description: z.string().max(2000).optional(),
  questionnaire_type: z.enum(['survey', 'assessment', 'evaluation', 'monitoring', 'baseline', 'endline', 'kpi_collection', 'beneficiary_feedback', 'needs_assessment', 'other']),
  primary_language: z.string().min(1),
  estimated_duration_minutes: z.coerce.number().min(1).optional(),
  study_id: z.string().optional(),
});

type FormValues = z.infer<typeof questionnaireSchema>;

const QUESTIONNAIRE_TYPES = [
  { value: 'survey', label: 'Survey' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'evaluation', label: 'Evaluation' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'baseline', label: 'Baseline' },
  { value: 'endline', label: 'Endline' },
  { value: 'kpi_collection', label: 'KPI Collection' },
  { value: 'beneficiary_feedback', label: 'Beneficiary Feedback' },
  { value: 'needs_assessment', label: 'Needs Assessment' },
  { value: 'other', label: 'Other' },
];

interface QuestionnaireFormProps {
  questionnaire?: Questionnaire;
  onSubmit: (data: CreateQuestionnaireDto) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function QuestionnaireForm({ questionnaire, onSubmit, isSubmitting, onCancel }: QuestionnaireFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(questionnaireSchema),
    defaultValues: {
      title: questionnaire?.title || '',
      description: questionnaire?.description || '',
      questionnaire_type: questionnaire?.questionnaire_type || 'survey',
      primary_language: questionnaire?.primary_language || 'en',
      estimated_duration_minutes: questionnaire?.estimated_duration_minutes,
      study_id: questionnaire?.study_id || '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>Title *</FormLabel><FormControl><Input placeholder="e.g., Household Survey 2026" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Brief description" className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="questionnaire_type" render={({ field }) => (
            <FormItem><FormLabel>Type *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
              {QUESTIONNAIRE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent></Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="primary_language" render={({ field }) => (
            <FormItem><FormLabel>Primary Language *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="sw">Swahili</SelectItem>
              <SelectItem value="ar">Arabic</SelectItem>
            </SelectContent></Select><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="estimated_duration_minutes" render={({ field }) => (
          <FormItem><FormLabel>Estimated Duration (minutes)</FormLabel><FormControl><Input type="number" placeholder="e.g., 30" {...field} /></FormControl><FormDescription>How long will this questionnaire take to complete?</FormDescription><FormMessage /></FormItem>
        )} />
        <div className="flex items-center justify-end gap-3 pt-4">
          {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" loading={isSubmitting}>{questionnaire ? 'Update' : 'Create Questionnaire'}</Button>
        </div>
      </form>
    </Form>
  );
}
