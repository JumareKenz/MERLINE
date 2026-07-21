'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { Indicator } from '@/types/indicator';

const indicatorSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(3).max(300),
  definition: z.string().max(2000).optional(),
  indicator_type: z.enum(['quantitative', 'qualitative', 'proxy', 'composite']),
  data_type: z.enum(['boolean', 'percentage', 'count', 'ratio', 'score', 'currency', 'duration']),
  level: z.enum(['impact', 'outcome', 'output', 'process', 'input']),
  direction: z.enum(['positive', 'negative', 'neutral']),
  unit: z.string().max(100).optional(),
  numerator: z.string().max(500).optional(),
  denominator: z.string().max(500).optional(),
  formula: z.string().max(500).optional(),
  frequency: z.enum(['monthly', 'quarterly', 'bi_annual', 'annual', 'ad_hoc']),
  data_source: z.string().max(500).optional(),
  collection_method: z.string().max(500).optional(),
  baseline_value: z.coerce.number().optional(),
  baseline_year: z.coerce.number().int().optional(),
  target_value: z.coerce.number().optional(),
  target_year: z.coerce.number().int().optional(),
  threshold_min: z.coerce.number().optional(),
  threshold_max: z.coerce.number().optional(),
  is_kpi: z.boolean().default(false),
});

type IndicatorFormValues = z.infer<typeof indicatorSchema>;

interface IndicatorFormProps {
  indicator?: Indicator;
  onSubmit: (data: IndicatorFormValues) => void;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function IndicatorForm({ indicator, onSubmit, isSubmitting, onCancel }: IndicatorFormProps) {
  const form = useForm<IndicatorFormValues>({
    resolver: zodResolver(indicatorSchema),
    defaultValues: {
      code: indicator?.code || '',
      name: indicator?.name || '',
      definition: indicator?.definition || '',
      indicator_type: indicator?.indicator_type || 'quantitative',
      data_type: indicator?.data_type || 'count',
      level: indicator?.level || 'output',
      direction: indicator?.direction || 'positive',
      unit: indicator?.unit || '',
      numerator: indicator?.numerator || '',
      denominator: indicator?.denominator || '',
      formula: indicator?.formula || '',
      frequency: indicator?.frequency || 'annual',
      data_source: indicator?.data_source || '',
      collection_method: indicator?.collection_method || '',
      baseline_value: indicator?.baseline_value,
      baseline_year: indicator?.baseline_year,
      target_value: indicator?.target_value,
      target_year: indicator?.target_year,
      threshold_min: indicator?.threshold_min,
      threshold_max: indicator?.threshold_max,
      is_kpi: indicator?.is_kpi || false,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem><FormLabel>Code *</FormLabel><FormControl><Input placeholder="e.g., IND-001" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="data_type" render={({ field }) => (
              <FormItem><FormLabel>Data Type *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                {['boolean', 'percentage', 'count', 'ratio', 'score', 'currency', 'duration'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent></Select><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem><FormLabel>Indicator Name *</FormLabel><FormControl><Input placeholder="e.g., Vaccination Coverage Rate" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="definition" render={({ field }) => (
            <FormItem><FormLabel>Definition</FormLabel><FormControl><Textarea placeholder="Detailed definition of the indicator" className="min-h-[80px]" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider">Classification</h3>
          <div className="grid grid-cols-3 gap-4">
            <FormField control={form.control} name="indicator_type" render={({ field }) => (
              <FormItem><FormLabel>Type *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                {['quantitative', 'qualitative', 'proxy', 'composite'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="level" render={({ field }) => (
              <FormItem><FormLabel>Level *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                {['impact', 'outcome', 'output', 'process', 'input'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="direction" render={({ field }) => (
              <FormItem><FormLabel>Direction *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                {['positive', 'negative', 'neutral'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent></Select><FormMessage /></FormItem>
            )} />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider">Calculation</h3>
          <div className="grid grid-cols-3 gap-4">
            <FormField control={form.control} name="unit" render={({ field }) => (
              <FormItem><FormLabel>Unit</FormLabel><FormControl><Input placeholder="e.g., %, count" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="numerator" render={({ field }) => (
              <FormItem><FormLabel>Numerator</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="denominator" render={({ field }) => (
              <FormItem><FormLabel>Denominator</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="formula" render={({ field }) => (
            <FormItem><FormLabel>Formula</FormLabel><FormControl><Input placeholder="e.g., (numerator / denominator) * 100" {...field} /></FormControl></FormItem>
          )} />
          <FormField control={form.control} name="frequency" render={({ field }) => (
            <FormItem><FormLabel>Frequency *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
              {['monthly', 'quarterly', 'bi_annual', 'annual', 'ad_hoc'].map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent></Select><FormMessage /></FormItem>
          )} />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground-secondary uppercase tracking-wider">Targets</h3>
          <div className="grid grid-cols-4 gap-4">
            <FormField control={form.control} name="baseline_value" render={({ field }) => (
              <FormItem><FormLabel>Baseline Value</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="baseline_year" render={({ field }) => (
              <FormItem><FormLabel>Baseline Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="target_value" render={({ field }) => (
              <FormItem><FormLabel>Target Value</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="target_year" render={({ field }) => (
              <FormItem><FormLabel>Target Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="threshold_min" render={({ field }) => (
              <FormItem><FormLabel>Min Threshold</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="threshold_max" render={({ field }) => (
              <FormItem><FormLabel>Max Threshold</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="is_kpi" render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Mark as Key Performance Indicator (KPI)</FormLabel>
                <FormDescription>KPIs appear on dashboards and executive reports</FormDescription>
              </div>
            </FormItem>
          )} />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
          <Button type="submit" loading={isSubmitting}>{indicator ? 'Update Indicator' : 'Create Indicator'}</Button>
        </div>
      </form>
    </Form>
  );
}
