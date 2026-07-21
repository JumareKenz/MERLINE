'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Study } from '@/types/study';

const studySchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(500),
  study_type: z.string().min(1, 'Study type is required'),
  methodology: z.string().min(1, 'Methodology is required'),
  purpose: z.string().max(2000).optional(),
  population: z.string().max(1000).optional(),
  sample_size: z.coerce.number().min(1).optional(),
  location: z.string().max(500).optional(),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
}).refine((d) => !d.start_date || !d.end_date || new Date(d.end_date) > new Date(d.start_date), {
  message: 'End date must be after start date',
  path: ['end_date'],
});

export type StudyFormValues = z.infer<typeof studySchema>;

interface StudyFormProps {
  study?: Study;
  onSubmit: (data: StudyFormValues) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function StudyForm({ study, onSubmit, isSubmitting, onCancel }: StudyFormProps) {
  const form = useForm<z.infer<typeof studySchema>>({
    resolver: zodResolver(studySchema),
    defaultValues: {
      title: study?.title || '',
      purpose: study?.purpose || '',
      population: study?.population || '',
      sample_size: study?.sample_size,
      location: study?.location || '',
      start_date: study?.start_date?.split('T')[0] || '',
      end_date: study?.end_date?.split('T')[0] || '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Study Title *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Health Baseline Survey 2026" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="study_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Study Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="BASELINE">Baseline</SelectItem>
                    <SelectItem value="ENDLINE">Endline</SelectItem>
                    <SelectItem value="MIDLINE">Midline</SelectItem>
                    <SelectItem value="KAP">KAP</SelectItem>
                    <SelectItem value="QUALITATIVE">Qualitative</SelectItem>
                    <SelectItem value="CASE_STUDY">Case Study</SelectItem>
                    <SelectItem value="MIXED_METHODS">Mixed Methods</SelectItem>
                    <SelectItem value="RAPID_ASSESSMENT">Rapid Assessment</SelectItem>
                    <SelectItem value="LOT_QUALITY_ASSURANCE">LQAS</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="methodology"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Methodology *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select methodology" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="QUANTITATIVE">Quantitative</SelectItem>
                    <SelectItem value="QUALITATIVE">Qualitative</SelectItem>
                    <SelectItem value="MIXED_METHODS">Mixed Methods</SelectItem>
                    <SelectItem value="PARTICIPATORY">Participatory</SelectItem>
                    <SelectItem value="DESK_REVIEW">Desk Review</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose & Objectives</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the purpose and objectives of this study" className="min-h-[100px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="population"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Population</FormLabel>
              <FormControl>
                <Textarea placeholder="Target population description" className="min-h-[60px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="sample_size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sample Size</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 1200" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Nairobi, Kenya" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={isSubmitting}>
            {study ? 'Update Study' : 'Create Study'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
